
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':8080/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var Solsido = (function () {
  'use strict';

  const sharedConfig = {};

  const equalFn = (a, b) => a === b;
  const signalOptions = {
    equals: equalFn
  };
  let runEffects = runQueue;
  const NOTPENDING = {};
  const STALE = 1;
  const PENDING = 2;
  const UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null;
  let Transition = null;
  let Listener = null;
  let Pending = null;
  let Updates = null;
  let Effects = null;
  let ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener,
          owner = Owner,
          root = fn.length === 0 && !false ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: null,
      owner: detachedOwner || owner
    };
    Owner = root;
    Listener = null;
    try {
      return runUpdates(() => fn(() => cleanNode(root)), true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      pending: NOTPENDING,
      comparator: options.equals || undefined
    };
    const setter = value => {
      if (typeof value === "function") {
        value = value(s.pending !== NOTPENDING ? s.pending : s.value);
      }
      return writeSignal(s, value);
    };
    return [readSignal.bind(s), setter];
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.pending = NOTPENDING;
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || undefined;
    updateComputation(c);
    return readSignal.bind(c);
  }
  function batch(fn) {
    if (Pending) return fn();
    let result;
    const q = Pending = [];
    try {
      result = fn();
    } finally {
      Pending = null;
    }
    runUpdates(() => {
      for (let i = 0; i < q.length; i += 1) {
        const data = q[i];
        if (data.pending !== NOTPENDING) {
          const pending = data.pending;
          data.pending = NOTPENDING;
          writeSignal(data, pending);
        }
      }
    }, false);
    return result;
  }
  function untrack(fn) {
    let result,
        listener = Listener;
    Listener = null;
    result = fn();
    Listener = listener;
    return result;
  }
  function onCleanup(fn) {
    if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
    return fn;
  }
  function children(fn) {
    const children = createMemo(fn);
    return createMemo(() => resolveChildren(children()));
  }
  function readSignal() {
    const runningTransition = Transition ;
    if (this.sources && (this.state || runningTransition )) {
      const updates = Updates;
      Updates = null;
      this.state === STALE || runningTransition  ? updateComputation(this) : lookDownstream(this);
      Updates = updates;
    }
    if (Listener) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener.sources) {
        Listener.sources = [this];
        Listener.sourceSlots = [sSlot];
      } else {
        Listener.sources.push(this);
        Listener.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener];
        this.observerSlots = [Listener.sources.length - 1];
      } else {
        this.observers.push(Listener);
        this.observerSlots.push(Listener.sources.length - 1);
      }
    }
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    if (node.comparator) {
      if (node.comparator(node.value, value)) return value;
    }
    if (Pending) {
      if (node.pending === NOTPENDING) Pending.push(node);
      node.pending = value;
      return value;
    }
    let TransitionRunning = false;
    node.value = value;
    if (node.observers && node.observers.length) {
      runUpdates(() => {
        for (let i = 0; i < node.observers.length; i += 1) {
          const o = node.observers[i];
          if (TransitionRunning && Transition.disposed.has(o)) ;
          if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
            if (o.pure) Updates.push(o);else Effects.push(o);
            if (o.observers) markUpstream(o);
          }
          if (TransitionRunning) ;else o.state = STALE;
        }
        if (Updates.length > 10e5) {
          Updates = [];
          if (false) ;
          throw new Error();
        }
      }, false);
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn) return;
    cleanNode(node);
    const owner = Owner,
          listener = Listener,
          time = ExecCount;
    Listener = Owner = node;
    runComputation(node, node.value, time);
    Listener = listener;
    Owner = owner;
  }
  function runComputation(node, value, time) {
    let nextValue;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      handleError(err);
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.observers && node.observers.length) {
        writeSignal(node, nextValue);
      } else node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state: state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: null,
      pure
    };
    if (Owner === null) ;else if (Owner !== UNOWNED) {
      {
        if (!Owner.owned) Owner.owned = [c];else Owner.owned.push(c);
      }
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition ;
    if (node.state === 0 || runningTransition ) return;
    if (node.state === PENDING || runningTransition ) return lookDownstream(node);
    if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (node.state || runningTransition ) ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (node.state === STALE || runningTransition ) {
        updateComputation(node);
      } else if (node.state === PENDING || runningTransition ) {
        const updates = Updates;
        Updates = null;
        lookDownstream(node, ancestors[0]);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates) return fn();
    let wait = false;
    if (!init) Updates = [];
    if (Effects) wait = true;else Effects = [];
    ExecCount++;
    try {
      return fn();
    } catch (err) {
      handleError(err);
    } finally {
      completeUpdates(wait);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      runQueue(Updates);
      Updates = null;
    }
    if (wait) return;
    if (Effects.length) batch(() => {
      runEffects(Effects);
      Effects = null;
    });else {
      Effects = null;
    }
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++) runTop(queue[i]);
  }
  function lookDownstream(node, ignore) {
    const runningTransition = Transition ;
    node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        if (source.state === STALE || runningTransition ) {
          if (source !== ignore) runTop(source);
        } else if (source.state === PENDING || runningTransition ) lookDownstream(source, ignore);
      }
    }
  }
  function markUpstream(node) {
    const runningTransition = Transition ;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (!o.state || runningTransition ) {
        o.state = PENDING;
        if (o.pure) Updates.push(o);else Effects.push(o);
        o.observers && markUpstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(),
              index = node.sourceSlots.pop(),
              obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(),
                s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (node.owned) {
      for (i = 0; i < node.owned.length; i++) cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = 0; i < node.cleanups.length; i++) node.cleanups[i]();
      node.cleanups = null;
    }
    node.state = 0;
    node.context = null;
  }
  function handleError(err) {
    throw err;
  }
  function resolveChildren(children) {
    if (typeof children === "function" && !children.length) return resolveChildren(children());
    if (Array.isArray(children)) {
      const results = [];
      for (let i = 0; i < children.length; i++) {
        const result = resolveChildren(children[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }
      return results;
    }
    return children;
  }

  const FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++) d[i]();
  }
  function mapArray(list, mapFn, options = {}) {
    let items = [],
        mapped = [],
        disposers = [],
        len = 0,
        indexes = mapFn.length > 1 ? [] : null;
    onCleanup(() => dispose(disposers));
    return () => {
      let newItems = list() || [],
          i,
          j;
      return untrack(() => {
        let newLen = newItems.length,
            newIndices,
            newIndicesNext,
            temp,
            tempdisposers,
            tempIndexes,
            start,
            end,
            newEnd,
            item;
        if (newLen === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            indexes && (indexes = []);
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot(disposer => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        }
        else if (len === 0) {
          mapped = new Array(newLen);
          for (j = 0; j < newLen; j++) {
            items[j] = newItems[j];
            mapped[j] = createRoot(mapper);
          }
          len = newLen;
        } else {
          temp = new Array(newLen);
          tempdisposers = new Array(newLen);
          indexes && (tempIndexes = new Array(newLen));
          for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++);
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
            temp[newEnd] = mapped[end];
            tempdisposers[newEnd] = disposers[end];
            indexes && (tempIndexes[newEnd] = indexes[end]);
          }
          newIndices = new Map();
          newIndicesNext = new Array(newEnd + 1);
          for (j = newEnd; j >= start; j--) {
            item = newItems[j];
            i = newIndices.get(item);
            newIndicesNext[j] = i === undefined ? -1 : i;
            newIndices.set(item, j);
          }
          for (i = start; i <= end; i++) {
            item = items[i];
            j = newIndices.get(item);
            if (j !== undefined && j !== -1) {
              temp[j] = mapped[i];
              tempdisposers[j] = disposers[i];
              indexes && (tempIndexes[j] = indexes[i]);
              j = newIndicesNext[j];
              newIndices.set(item, j);
            } else disposers[i]();
          }
          for (j = start; j < newLen; j++) {
            if (j in temp) {
              mapped[j] = temp[j];
              disposers[j] = tempdisposers[j];
              if (indexes) {
                indexes[j] = tempIndexes[j];
                indexes[j](j);
              }
            } else mapped[j] = createRoot(mapper);
          }
          mapped = mapped.slice(0, len = newLen);
          items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        if (indexes) {
          const [s, set] = createSignal(j);
          indexes[j] = set;
          return mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  function indexArray(list, mapFn, options = {}) {
    let items = [],
        mapped = [],
        disposers = [],
        signals = [],
        len = 0,
        i;
    onCleanup(() => dispose(disposers));
    return () => {
      const newItems = list() || [];
      return untrack(() => {
        if (newItems.length === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            signals = [];
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot(disposer => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
          return mapped;
        }
        if (items[0] === FALLBACK) {
          disposers[0]();
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
        }
        for (i = 0; i < newItems.length; i++) {
          if (i < items.length && items[i] !== newItems[i]) {
            signals[i](() => newItems[i]);
          } else if (i >= items.length) {
            mapped[i] = createRoot(mapper);
          }
        }
        for (; i < items.length; i++) {
          disposers[i]();
        }
        len = signals.length = disposers.length = newItems.length;
        items = newItems.slice(0);
        return mapped = mapped.slice(0, len);
      });
      function mapper(disposer) {
        disposers[i] = disposer;
        const [s, set] = createSignal(newItems[i]);
        signals[i] = set;
        return mapFn(s, i);
      }
    };
  }
  function createComponent(Comp, props) {
    return untrack(() => Comp(props));
  }

  function For(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(mapArray(() => props.each, props.children, fallback ? fallback : undefined));
  }
  function Index(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(indexArray(() => props.each, props.children, fallback ? fallback : undefined));
  }
  function Show(props) {
    let strictEqual = false;
    const condition = createMemo(() => props.when, undefined, {
      equals: (a, b) => strictEqual ? a === b : !a === !b
    });
    return createMemo(() => {
      const c = condition();
      if (c) {
        const child = props.children;
        return (strictEqual = typeof child === "function" && child.length > 0) ? untrack(() => child(c)) : child;
      }
      return props.fallback;
    });
  }
  function Switch(props) {
    let strictEqual = false;
    const conditions = children(() => props.children),
          evalConditions = createMemo(() => {
      let conds = conditions();
      if (!Array.isArray(conds)) conds = [conds];
      for (let i = 0; i < conds.length; i++) {
        const c = conds[i].when;
        if (c) return [i, c, conds[i]];
      }
      return [-1];
    }, undefined, {
      equals: (a, b) => a[0] === b[0] && (strictEqual ? a[1] === b[1] : !a[1] === !b[1]) && a[2] === b[2]
    });
    return createMemo(() => {
      const [index, when, cond] = evalConditions();
      if (index < 0) return props.fallback;
      const c = cond.children;
      return (strictEqual = typeof c === "function" && c.length > 0) ? untrack(() => c(when)) : c;
    });
  }
  function Match(props) {
    return props;
  }

  function memo(fn, equals) {
    return createMemo(fn, undefined, !equals ? {
      equals
    } : undefined);
  }

  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length,
        aEnd = a.length,
        bEnd = bLength,
        aStart = 0,
        bStart = 0,
        after = a[aEnd - 1].nextSibling,
        map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart])) a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = new Map();
          let i = bStart;
          while (i < bEnd) map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart,
                sequence = 1,
                t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence) break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index) parentNode.insertBefore(b[bStart++], node);
            } else parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else aStart++;
        } else a[aStart++].remove();
      }
    }
  }
  function render(code, element, init) {
    let disposer;
    createRoot(dispose => {
      disposer = dispose;
      element === document ? code() : insert(element, code(), element.firstChild ? null : undefined, init);
    });
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function template(html, check, isSVG) {
    const t = document.createElement("template");
    t.innerHTML = html;
    let node = t.content.firstChild;
    if (isSVG) node = node.firstChild;
    return node;
  }
  function style(node, value, prev = {}) {
    const nodeStyle = node.style;
    if (value == null || typeof value === "string") return nodeStyle.cssText = value;
    typeof prev === "string" && (prev = {});
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
      }
    }
    return prev;
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== undefined && !initial) initial = [];
    if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
    createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    if (sharedConfig.context && !current) current = [...parent.childNodes];
    while (typeof current === "function") current = current();
    if (value === current) return current;
    const t = typeof value,
          multi = marker !== undefined;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (sharedConfig.context) return current;
      if (t === "number") value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data = value;
        } else node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (sharedConfig.context) return current;
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function") v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      if (normalizeIncomingArray(array, value, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (sharedConfig.context) {
        for (let i = 0; i < array.length; i++) {
          if (array[i].parentNode) return current = array;
        }
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi) return current;
      } else if (Array.isArray(current)) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else {
        current && cleanChildren(parent);
        appendNodes(parent, array);
      }
      current = array;
    } else if (value instanceof Node) {
      if (sharedConfig.context && value.parentNode) return current = multi ? [value] : value;
      if (Array.isArray(current)) {
        if (multi) return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else parent.replaceChild(value, parent.firstChild);
      current = value;
    } else ;
    return current;
  }
  function normalizeIncomingArray(normalized, array, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i],
          t;
      if (item instanceof Node) {
        normalized.push(item);
      } else if (item == null || item === true || item === false) ; else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item) || dynamic;
      } else if ((t = typeof item) === "string") {
        normalized.push(document.createTextNode(item));
      } else if (t === "function") {
        if (unwrap) {
          while (typeof item === "function") item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item]) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else normalized.push(document.createTextNode(item.toString()));
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker) {
    for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === undefined) return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);else isParent && el.remove();
        } else inserted = true;
      }
    } else parent.insertBefore(node, marker);
    return [node];
  }

  const gclef = '';
  const bclef = '';
  const double_note = '';
  const whole_note = '';
  const half_note = '';
  const quarter_note = '';
  const brace = '';
  const flat_accidental = '';
  const natural_accidental = '';
  const sharp_accidental = '';
  const dsharp_accidental = '';
  const dflat_accidental = '';
  const eighth_flag_up = '';
  const sixteenth_flag_up = '';
  const thirtysecond_flag_up = '';
  const sixtyfourth_flag_up = '';
  const eighth_flag_down = '';
  const sixteenth_flag_down = '';
  const thirtysecond_flag_down = '';
  const sixtyfourth_flag_down = '';
  const double_rest = '';
  const whole_rest = '';
  const half_rest = '';
  const quarter_rest = '';
  const eighth_rest = '';
  const sixteenth_rest = '';
  const thirtysecond_rest = '';
  const sixtyfourth_rest = '';
  const onetwentyeighth_rest = '';
  const zero_time = '';
  const one_time = '';
  const two_time = '';
  const three_time = '';
  const four_time = '';
  const five_time = '';
  const six_time = '';
  const seven_time = '';
  const eight_time = '';
  const nine_time = '';
  const ten_time = one_time + zero_time;
  const twelve_time = one_time + two_time;
  const quarter_text = '';
  var g = {
    quarter_text,
    gclef,
    bclef,
    double_note,
    whole_note,
    half_note,
    quarter_note,
    flat_accidental,
    natural_accidental,
    sharp_accidental,
    dflat_accidental,
    dsharp_accidental,
    eighth_flag_down,
    sixteenth_flag_down,
    thirtysecond_flag_down,
    sixtyfourth_flag_down,
    eighth_flag_up,
    sixteenth_flag_up,
    thirtysecond_flag_up,
    sixtyfourth_flag_up,
    brace,
    double_rest,
    whole_rest,
    half_rest,
    quarter_rest,
    eighth_rest,
    sixteenth_rest,
    thirtysecond_rest,
    sixtyfourth_rest,
    onetwentyeighth_rest,
    zero_time,
    one_time,
    two_time,
    three_time,
    four_time,
    five_time,
    six_time,
    seven_time,
    eight_time,
    nine_time,
    ten_time,
    twelve_time
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  var lib = {};

  var types = {};

  Object.defineProperty(types, "__esModule", { value: true });

  var matchmaker = {};

  (function (exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.mmap = exports.mrplus = exports.mr = exports.mseq3 = exports.mseq3Separator = exports.msecond = exports.meither = exports.mstar = exports.mOpt = exports.mgroup = exports.mlookahead = exports.mrec = exports.mpass = exports.noneMatcherNode = exports.oneMatcherNode = exports.fLast = exports.fSecond = exports.fId = void 0;
  function fId(_) {
      return _;
  }
  exports.fId = fId;
  function fSecond(_) {
      return _[1];
  }
  exports.fSecond = fSecond;
  function fLast(_) {
      return _[2];
  }
  exports.fLast = fLast;
  function oneMatcherNode(tpe) {
      return function (value) {
          return {
              tpe,
              value
          };
      };
  }
  exports.oneMatcherNode = oneMatcherNode;
  exports.noneMatcherNode = oneMatcherNode("none")("");
  const mpass = function (rest) {
      return {
          rest,
          acc: exports.noneMatcherNode
      };
  };
  exports.mpass = mpass;
  function mrec(data) {
      return function (rest) {
          let _matcher = data();
          let _res = _matcher(rest);
          return _res;
      };
  }
  exports.mrec = mrec;
  function mlookahead(data) {
      return function (rest) {
          let m = rest.match(data);
          if (m) {
              return {
                  rest,
                  acc: exports.noneMatcherNode
              };
          }
      };
  }
  exports.mlookahead = mlookahead;
  function mgroup(data, f) {
      return function (rest) {
          let _matcher = data;
          let _res = _matcher(rest);
          if (_res) {
              return {
                  rest: _res.rest,
                  acc: f(_res.acc)
              };
          }
      };
  }
  exports.mgroup = mgroup;
  function mOpt(data) {
      return function (rest) {
          let _matcher = data;
          let _res = _matcher(rest);
          if (_res) {
              return _res;
          }
          else {
              return {
                  rest,
                  acc: exports.noneMatcherNode
              };
          }
      };
  }
  exports.mOpt = mOpt;
  function mstar(data) {
      return function (rest) {
          let accs = [];
          let _matcher = data;
          while (true) {
              let _res = _matcher(rest);
              if (!_res) {
                  break;
              }
              let { acc: _acc, rest: _rest } = _res;
              if (rest === _rest) {
                  break;
              }
              rest = _rest;
              accs.push(_acc);
              if (rest.length === 0) {
                  break;
              }
          }
          let acc = [];
          accs.forEach(_ => {
              if (typeof _ !== 'string') {
                  acc = acc.concat(_);
              }
          });
          if (accs.length === 0) {
              return undefined;
          }
          else {
              return {
                  rest,
                  acc
              };
          }
      };
  }
  exports.mstar = mstar;
  function meither(data) {
      return function (rest) {
          for (let _matcher of data) {
              let _res = _matcher(rest);
              if (_res) {
                  return _res;
              }
          }
      };
  }
  exports.meither = meither;
  function msecond(data) {
      return mseq3(data, fSecond);
  }
  exports.msecond = msecond;
  function mseq3Separator(separator, data, fA) {
      let [_0, _1, _2] = data;
      return mseq3([msecond([exports.mpass, _0, separator]),
          msecond([exports.mpass, _1, separator]),
          _2], fA);
  }
  exports.mseq3Separator = mseq3Separator;
  function mseq3(data, fA) {
      return function (rest) {
          let accs = [];
          for (let _matcher of data) {
              let _res = _matcher(rest);
              if (!_res) {
                  return undefined;
              }
              let { acc: _acc, rest: _rest } = _res;
              rest = _rest;
              accs.push(_acc);
          }
          if (accs.length === 3) {
              return {
                  rest,
                  acc: fA(accs)
              };
          }
      };
  }
  exports.mseq3 = mseq3;
  function mr(data, tpe) {
      let reducer = oneMatcherNode(tpe);
      return function (rest) {
          let m = rest.match(data);
          if (m) {
              let [_, _acc, _rest] = m;
              if (rest !== _rest) {
                  return {
                      rest: _rest,
                      acc: reducer(_acc)
                  };
              }
          }
      };
  }
  exports.mr = mr;
  function mrplus(data, nbCapture, reducer) {
      return function (rest) {
          let m = rest.match(data);
          if (m) {
              let [_, ..._rest] = m;
              let cgroups = _rest.slice(0, nbCapture), __rest = _rest[nbCapture];
              if (rest !== __rest) {
                  return {
                      rest: __rest,
                      acc: reducer(cgroups)
                  };
              }
          }
      };
  }
  exports.mrplus = mrplus;
  function mmap(data, tpe) {
      let reducer = oneMatcherNode(tpe);
      return function (rest) {
          let m = data.find(_ => rest.startsWith(_));
          if (m) {
              let _rest = rest.slice(m.length);
              return {
                  rest: _rest,
                  acc: reducer(m)
              };
          }
      };
  }
  exports.mmap = mmap;

  }(matchmaker));

  var reducers = {};

  var __createBinding = (commonjsGlobal && commonjsGlobal.__createBinding) || (Object.create ? (function(o, m, k, k2) {
      if (k2 === undefined) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
  }) : (function(o, m, k, k2) {
      if (k2 === undefined) k2 = k;
      o[k2] = m[k];
  }));
  var __setModuleDefault = (commonjsGlobal && commonjsGlobal.__setModuleDefault) || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
      o["default"] = v;
  });
  var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      __setModuleDefault(result, mod);
      return result;
  };
  Object.defineProperty(reducers, "__esModule", { value: true });
  reducers.fSecond = reducers.fReduceOneAndThree = reducers.fOneAndThree = reducers.fFirstAndThird = reducers.fSliceTriple = reducers.fAll = reducers.fFirst = reducers.fLast = reducers.fLastTwo = reducers.fFirstTwo = void 0;
  const mm = __importStar(matchmaker);
  const fFirstTwo = (tpe) => {
      return fSliceTriple(tpe, 0, 2);
  };
  reducers.fFirstTwo = fFirstTwo;
  const fLastTwo = (tpe) => {
      return fSliceTriple(tpe, 1, 3);
  };
  reducers.fLastTwo = fLastTwo;
  const fLast = (tpe) => {
      return fSliceTriple(tpe, 2, 3);
  };
  reducers.fLast = fLast;
  const fFirst = (tpe) => {
      return fSliceTriple(tpe, 0, 1);
  };
  reducers.fFirst = fFirst;
  const fAll = (tpe) => {
      return fSliceTriple(tpe, 0, 3);
  };
  reducers.fAll = fAll;
  function fSliceTriple(tpe, s, e) {
      return function fReduceMove(_) {
          return mm.oneMatcherNode(tpe)(_.slice(s, e));
      };
  }
  reducers.fSliceTriple = fSliceTriple;
  reducers.fFirstAndThird = fReduceOneAndThree;
  reducers.fOneAndThree = fReduceOneAndThree;
  function fReduceOneAndThree(tpe) {
      return function (_) {
          let [line, __, fen] = _;
          return mm.oneMatcherNode(tpe)([line, fen]);
      };
  }
  reducers.fReduceOneAndThree = fReduceOneAndThree;
  function fSecond(tpe) {
      return function (_) {
          let [__, second, ___] = _;
          return mm.oneMatcherNode(tpe)(second);
      };
  }
  reducers.fSecond = fSecond;

  var nodetomodel = {};

  Object.defineProperty(nodetomodel, "__esModule", { value: true });
  class NodeToModel {
      constructor(leafRefs, branchRefs) {
          this.leafRefs = leafRefs;
          this.branchRefs = branchRefs;
      }
      mrLeaf(rmv, mv) {
          var _a, _b;
          return (_b = (_a = this.leafRefs)[rmv.tpe]) === null || _b === void 0 ? void 0 : _b.call(_a, mv);
      }
      mrBranch(rmv, children) {
          var _a, _b;
          return (_b = (_a = this.branchRefs)[rmv.tpe]) === null || _b === void 0 ? void 0 : _b.call(_a, children);
      }
      reducer(rmv, mv, children) {
          let cFlat = children.filter(Boolean);
          if (mv === 'root') {
              return cFlat[0];
          }
          else if (typeof mv === 'string') {
              if (typeof rmv === 'string') ;
              else if (Array.isArray(rmv)) ;
              else {
                  return this.mrLeaf(rmv, mv);
              }
          }
          else if (Array.isArray(mv)) {
              if (typeof rmv === 'string') {
                  if (rmv === 'rootroot') {
                      return cFlat;
                  }
              }
              else if (Array.isArray(rmv)) ;
              else {
                  return this.mrBranch(rmv, cFlat);
              }
          }
          else {
              return cFlat[0];
          }
      }
  }
  nodetomodel.default = NodeToModel;

  var model$1 = {};

  Object.defineProperty(model$1, "__esModule", { value: true });
  model$1.makeNarrower = model$1.wrapBranch = model$1.wrapSingleBranch = model$1.makeId = model$1.wrapLeaf = void 0;
  function wrapLeaf(prop) {
      return (_) => {
          return {
              [prop]: _
          };
      };
  }
  model$1.wrapLeaf = wrapLeaf;
  function makeId(_) {
      return _;
  }
  model$1.makeId = makeId;
  function wrapSingleBranch(_) {
      return _[0];
  }
  model$1.wrapSingleBranch = wrapSingleBranch;
  function wrapBranch(prop) {
      return (_) => {
          return {
              [prop]: _
          };
      };
  }
  model$1.wrapBranch = wrapBranch;
  function makeNarrower(property) {
      return (_) => {
          return (property in _);
      };
  }
  model$1.makeNarrower = makeNarrower;

  var tamcher$2 = {};

  var node$1 = {};

  Object.defineProperty(node$1, "__esModule", { value: true });
  node$1.reducePlus = node$1.reduce = node$1.filter = node$1.addChild = node$1.node = void 0;
  function node(value) {
      return {
          value,
          children: []
      };
  }
  node$1.node = node;
  function addChild(root, child) {
      root.children.push(child);
  }
  node$1.addChild = addChild;
  function filter(root, f) {
      return reduce(root, (_, children) => {
          let res = children.flat();
          if (f(_)) {
              res.push(_);
          }
          return res;
      });
  }
  node$1.filter = filter;
  function reduce(root, f) {
      return reducePlus(root, root.value, (_r, _, children) => f(_, children));
  }
  node$1.reduce = reduce;
  function reducePlus(root, rootValue, f) {
      let { value } = root;
      let children = root.children
          .flatMap(_ => reducePlus(_, value, f));
      return f(rootValue, value, children);
  }
  node$1.reducePlus = reducePlus;

  Object.defineProperty(tamcher$2, "__esModule", { value: true });
  tamcher$2.toNode = tamcher$2.fOfType = tamcher$2.fMatchNode = tamcher$2.maybeOneMatcherNode = tamcher$2.addOneMatcherToNode = void 0;
  const node_1 = node$1;
  function addOneMatcherToNode(root, mv) {
      let nn = node_1.node(mv);
      if (Array.isArray(mv)) {
          mv.map(_ => addOneMatcherToNode(nn, _));
      }
      else if (typeof mv === 'string') ;
      else {
          addOneMatcherToNode(nn, mv.value);
      }
      node_1.addChild(root, nn);
      return root;
  }
  tamcher$2.addOneMatcherToNode = addOneMatcherToNode;
  function maybeOneMatcherNode(_) {
      if (typeof _ === 'string') ;
      else if (Array.isArray(_)) ;
      else {
          return _;
      }
  }
  tamcher$2.maybeOneMatcherNode = maybeOneMatcherNode;
  function fMatchNode(f) {
      return (_) => {
          let n = maybeOneMatcherNode(_);
          if (n) {
              return f(n);
          }
          else {
              return false;
          }
      };
  }
  tamcher$2.fMatchNode = fMatchNode;
  function fOfType(tpe) {
      return function (_) {
          return _.tpe === tpe;
      };
  }
  tamcher$2.fOfType = fOfType;
  function toNode(mv) {
      return addOneMatcherToNode(node_1.node('root'), mv);
  }
  tamcher$2.toNode = toNode;
  function tamcher$1(mv) {
      return toNode(mv);
  }
  tamcher$2.default = tamcher$1;

  (function (exports) {
  var __createBinding = (commonjsGlobal && commonjsGlobal.__createBinding) || (Object.create ? (function(o, m, k, k2) {
      if (k2 === undefined) k2 = k;
      Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
  }) : (function(o, m, k, k2) {
      if (k2 === undefined) k2 = k;
      o[k2] = m[k];
  }));
  var __setModuleDefault = (commonjsGlobal && commonjsGlobal.__setModuleDefault) || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
  }) : function(o, v) {
      o["default"] = v;
  });
  var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      __setModuleDefault(result, mod);
      return result;
  };
  var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
      return (mod && mod.__esModule) ? mod : { "default": mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.toNode = exports.model = exports.NodeToModel = exports.rr = exports.mm = exports.tt = void 0;
  exports.tt = __importStar(types);
  exports.mm = __importStar(matchmaker);
  exports.rr = __importStar(reducers);
  var nodetomodel_1 = nodetomodel;
  Object.defineProperty(exports, "NodeToModel", { enumerable: true, get: function () { return __importDefault(nodetomodel_1).default; } });
  exports.model = __importStar(model$1);
  var tamcher_1 = tamcher$2;
  Object.defineProperty(exports, "toNode", { enumerable: true, get: function () { return tamcher_1.toNode; } });
  const tamcher_2 = __importDefault(tamcher$2);
  const node_1 = node$1;
  function mm(met, reducer) {
      let n = tamcher_2.default(met.acc);
      return node_1.reducePlus(n, 'rootroot', reducer);
  }
  exports.default = mm;

  }(lib));

  var tamcher = /*@__PURE__*/getDefaultExportFromCjs(lib);

  const mSpaceStar = lib.mm.mr(/^( +)(.*)$/s, 'space');
  const mSpace = lib.mm.mr(/^( )(.*)$/s, 'newline');
  const mNewline = lib.mm.mr(/^(\n)(.*)$/s, 'newline');
  const mSlash = lib.mm.mr(/^(\/)(.*)$/s, 'slash');
  const mWord = lib.mm.mr(/^([a-zA-Z]+)(.*)$/s, 'word');
  const mWordPlus = lib.mm.mr(/^([a-zA-Z0-9\/]+)(.*)$/s, 'word');
  const mText = lib.mm.mr(/^([a-z|A-Z|0-9| ]+)(.*)$/s, 'word');
  const mQuote = lib.mm.mr(/^(\")(.*)$/s, 'quote');
  const mChordBegin = lib.mm.mr(/^(\<)(.*)$/s, 'quote');
  const mChordEnd = lib.mm.mr(/^(\>)(.*)$/s, 'quote');
  const mRest = lib.mm.mr(/^([r])(.*)$/s, 'r');
  const mPitch = lib.mm.mr(/^([abcdefg])(.*)$/s, 'pitch');
  const mOctave = lib.mm.mr(/^([\'])(.*)$/s, 'octave');
  const mOctaveDown = lib.mm.mr(/^([\,])(.*)$/s, 'octave_down');
  const mAccidental = lib.mm.mr(/^([ie]s)(.*)$/s, 'accidental');
  const mTie = lib.mm.mr(/^(\~)(.*)$/s, 'tie');
  const mBar = lib.mm.mr(/^(\|)(.*)$/s, 'bar');
  const mDoubleBar = lib.mm.mr(/^(\|\|)(.*)$/s, 'dbar');
  const mDot = lib.mm.mr(/^(\.)(.*)$/s, 'dot');
  /* https://stackoverflow.com/questions/71474211/how-to-match-some-specific-one-digit-numbers-or-two-digit-numbers?noredirect=1#comment126330449_71474211 */

  const mDurationNumber = lib.mm.mr(/^([1248])(.*)$/s, 'duration_number');
  const mDurationNumber2 = lib.mm.mr(/^(16)(.*)$/s, 'duration_number');
  const mStaffsBegin = lib.mm.mr(/^(\<\<)(.*)$/s, 'dot');
  const mStaffsEnd = lib.mm.mr(/^(\>\>)(.*)$/s, 'dot');
  const mGrandStaffBegin = lib.mm.mr(/^(\/new GrandStaff)(.*)$/s, 'grandstaffbegin');
  const mQuotedText = lib.mm.mseq3([mQuote, mText, mQuote], lib.rr.fSecond('text'));
  const mDuration = lib.mm.mseq3([lib.mm.meither([mDurationNumber2, mDurationNumber]), lib.mm.mpass, lib.mm.mOpt(mDot)], lib.rr.fOneAndThree('duration'));
  const mWithPitchOctave = lib.mm.mseq3([lib.mm.meither([mRest, mPitch]), lib.mm.mseq3([lib.mm.mOpt(mAccidental), lib.mm.mOpt(mAccidental), lib.mm.mOpt(lib.mm.mgroup(lib.mm.mstar(lib.mm.meither([mOctave, mOctaveDown])), lib.mm.oneMatcherNode('octaves')))], lib.rr.fAll('accidentals_octave')), lib.mm.mseq3([lib.mm.mOpt(lib.mm.meither([mDuration, mQuotedText])), lib.mm.mpass, lib.mm.mOpt(mTie)], lib.rr.fOneAndThree('duration_ties'))], lib.rr.fAll('wPO'));
  const mNotes = lib.mm.mstar(lib.mm.meither([mWithPitchOctave, mSpace]));
  const mNotesOrBars = lib.mm.mstar(lib.mm.meither([mWithPitchOctave, mDoubleBar, mBar, mSpace]));
  const mChord = lib.mm.mseq3([mChordBegin, mNotes, mChordEnd], lib.rr.fSecond('chord'));
  const mCommand = lib.mm.mgroup(lib.mm.mseq3([lib.mm.mOpt(mSpaceStar), lib.mm.mseq3([mSlash, mWord, lib.mm.mseq3([mSpace, mWordPlus, lib.mm.mpass], lib.mm.fSecond)], _ => _.slice(1)), lib.mm.mOpt(mSpaceStar)], lib.mm.fSecond), lib.mm.oneMatcherNode('command'));
  const mChordOrNotes = lib.mm.mstar(lib.mm.meither([mNotesOrBars, mChord]));
  /*
  {
  /clef treble
  g'"G"
  }
  */

  const mStaff = lib.mm.mseq3([lib.mm.mr(/^(\{)(.*)$/s, 'sbegin'), lib.mm.mstar(lib.mm.meither([mNewline, mCommand, mChordOrNotes])), lib.mm.mr(/^(\})(.*)$/s, 'send')], lib.rr.fSecond('staff'));
  const mStaffs = lib.mm.mgroup(lib.mm.mstar(lib.mm.meither([mStaff, mSpace, mNewline])), lib.mm.oneMatcherNode('staffs'));
  const mWhitespace = lib.mm.mOpt(lib.mm.mstar(lib.mm.meither([mSpace, mNewline])));
  const mGrandStaff = lib.mm.mseq3([mGrandStaffBegin, lib.mm.mpass, lib.mm.mseq3([lib.mm.mseq3([mWhitespace, mStaffsBegin, mWhitespace], _ => 1), mStaffs, lib.mm.mseq3([mWhitespace, mStaffsEnd, lib.mm.mpass], _ => 1)], _ => _[1])], lib.rr.fLast('grandstaff'));
  const mMusic = lib.mm.meither([mGrandStaff, mStaffs]);

  const ignores = [];
  const ids = ['staffs', 'octave', 'pitch', 'clef', 'duration_number', 'dot', 'duration', 'text', 'word', 'accidental', 'tie', 'bar', 'dbar'];

  const defaultContext = () => ({
    duration: '4'
  });

  function model(ref, ctx = defaultContext()) {
    return ref.flatMap(_ => {
      if ("grandstaff" in _) {
        return {
          grandstaff: model(_.grandstaff, ctx)
        };
      } else if ("staffs" in _) {
        return {
          staffs: _.staffs.map(_ => staff(_, ctx))
        };
      }
    })[0];
  }
  function staff(_, ctx) {
    let {
      staff
    } = _;
    let notes = staff.flatMap(_ => {
      if ("command" in _) {
        return [command(_)];
      } else if ("dbar" in _) {
        return _.dbar;
      } else if ("bar" in _) {
        return _.bar;
      } else if ("wPO" in _) {
        return wPO(_, ctx);
      } else if ("chord" in _) {
        return [_.chord.map(_ => wPO(_, ctx))];
      }

      return [];
    });
    return {
      notes
    };
  }
  function command(_) {
    let {
      command
    } = _;
    return command.map(_ => _.word);
  }
  function wPO(_, ctx) {
    let {
      wPO
    } = _;

    if (wPO) {
      let _pitch = wPO.find(_ => "pitch" in _);

      let _accidental_octaves = wPO.find(_ => "accidentals_octave" in _);

      let _duration_ties = wPO.find(_ => "duration_ties" in _);

      let _octaves = _accidental_octaves?.accidentals_octave.find(_ => "octaves" in _);

      let _accidentals = _accidental_octaves?.accidentals_octave.filter(_ => "accidental" in _);

      let _text = _duration_ties?.duration_ties.find(_ => "text" in _);

      let _duration = _duration_ties?.duration_ties.find(_ => "duration" in _);

      let _tie = _duration_ties?.duration_ties.find(_ => "tie" in _);

      if (_pitch) {
        let pitch = _pitch.pitch,
            octave = _octaves?.octaves.length || 0;

        if (_text) {
          let text = _text.text.map(_ => _.word).join('');

          return {
            pitch,
            octave,
            text
          };
        } else {
          let duration = _duration?.duration;

          let _duration_number = duration?.find(_ => _.duration_number)?.duration_number,
              _duration_dot = duration?.find(_ => _.dot)?.dot;

          let accidental = _accidentals?.map(_ => _.accidental).join('');
          let tie = _tie?.tie;

          if (_duration_number) {
            ctx.duration = _duration_number;
          } else {
            _duration_number = ctx.duration;
          }

          return {
            pitch,
            octave,
            duration: _duration_number,
            dot: _duration_dot,
            accidental,
            tie
          };
        }
      }
    }
  }

  function mrLeaf(rmv, mv) {
    if (ignores.includes(rmv.tpe)) {
      return;
    }

    if (ids.includes(rmv.tpe)) {
      return {
        [rmv.tpe]: mv
      };
    }
  }

  function mrBranch(rmv, children) {
    return {
      [rmv.tpe]: children
    };
  }

  function reducer(rmv, mv, children) {
    let cFlat = children.filter(Boolean);

    if (rmv === 'rootroot') {
      return cFlat;
    }

    if (typeof mv === 'string') {
      if (typeof rmv === 'string') ; else if (Array.isArray(rmv)) {
        return cFlat;
      } else {
        return mrLeaf(rmv, mv);
      }
    } else if (Array.isArray(mv)) {
      if (typeof rmv === 'string') {
        return cFlat;
      } else if (Array.isArray(rmv)) {
        return cFlat;
      } else {
        return mrBranch(rmv, cFlat);
      }
    } else {
      if (typeof rmv === 'string') {
        return cFlat[0];
      } else if (Array.isArray(rmv)) {
        return cFlat[0];
      } else {
        return mrBranch(rmv, cFlat);
      }
    }
  }

  function read_fen(str) {
    let res = mMusic(str); //console.log(str, res)

    if (res) {
      return model(tamcher(res, reducer));
    }
  }

  const _tmpl$$1 = /*#__PURE__*/template(`<grand><span class="staff-line"></span><span class="brace"></span></grand>`),
        _tmpl$2$1 = /*#__PURE__*/template(`<div class="m-wrap"></div>`),
        _tmpl$3$1 = /*#__PURE__*/template(`<staff> <lines> <line></line> <line></line> <line></line> <line></line> <line></line> </lines></staff>`),
        _tmpl$4$1 = /*#__PURE__*/template(`<span class="bar"></span>`),
        _tmpl$5$1 = /*#__PURE__*/template(`<span class="text"></span>`),
        _tmpl$6$1 = /*#__PURE__*/template(`<span class="ledger"></span>`),
        _tmpl$7$1 = /*#__PURE__*/template(`<span></span>`),
        _tmpl$8$1 = /*#__PURE__*/template(`<div class="notes-duration-wrap"><table><thead><tr><th>Name</th><th>Note</th><th>Rest</th><th colspan="2">Equivalents</th></tr></thead><tbody><tr> <td>Double Whole Note</td><td> <!> </td><td> <!> </td><td>Two Whole Notes</td><td></td></tr><tr> <td>Whole Note</td><td> <!> </td><td> <!> </td><td>Two Half Notes</td><td></td></tr><tr> <td>Half Note</td><td> <!> </td><td> <!> </td><td>Two Quarter Notes</td><td></td></tr><tr> <td>Quarter Note</td><td> <!> </td><td> <!> </td><td>Two Eighth Notes</td><td></td></tr><tr> <td>Eighth Note</td><td> <!> </td><td> <!> </td><td>Two Sixteenth Notes</td><td></td></tr><tr> <td>Sixteenth Note</td><td> <!> </td><td> <!> </td><td>Two Thirty-second Notes</td><td></td></tr><tr> <td>Thirty-second Note</td><td> <!> </td><td> <!> </td><td>Two Sixty-fourth Notes</td><td></td></tr></tbody></table></div>`),
        _tmpl$9$1 = /*#__PURE__*/template(`<lines><line></line><line></line><line></line><line></line><line></line></lines>`),
        _tmpl$10$1 = /*#__PURE__*/template(`<div class="free-staff"></div>`),
        _tmpl$11$1 = /*#__PURE__*/template(`<div class="p-wrap"><div class="background"></div></div>`),
        _tmpl$12$1 = /*#__PURE__*/template(`<span class="letter"></span>`);

  function pitch_y(pitch, octave) {
    return ((4 - octave) * 7 + 7 - pitch) * 0.25 / 2;
  }

  const model_nb_beats = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  function model_to_nb_beats(_nb_beats) {
    return model_nb_beats.indexOf(_nb_beats);
  } // 1 2 4 8 16
  // d w h q e s t x
  // 1 2 3 4 5 6 7 8
  // 2 3 4 5 6


  const model_note_values = ['0', '0', '1', '2', '4', '8', '16', '32', '64'];

  function model_to_note_value(_note_value) {
    return model_note_values.indexOf(_note_value);
  }

  const model_clefs = ['treble', 'bass'];

  function model_to_clef(_clef) {
    let clef = model_clefs.indexOf(_clef) + 1;

    if (clef > 0) {
      return clef;
    }
  }

  let clef_codes = ['gclef', 'bclef'];

  function clef_to_code(clef) {
    return clef_codes[clef - 1];
  } // 9 Not a pitch


  let clef_pitches = [5, 9];

  function clef_to_pitch(clef) {
    return clef_pitches[clef - 1];
  }

  const nb_note_value_codes = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

  function nb_note_value_to_code(nb_note_value) {
    return nb_note_value_codes[nb_note_value] + '_time';
  } // 0 1 2 3 4 5 6 7 8 9 10 11 12
  // _ d w h q e s t x
  // z z o t f e s


  const note_value_codes = ['zero', 'zero', 'one', 'two', 'four', 'eight', 'sixth'];

  function note_value_to_code(note_value) {
    return note_value_codes[note_value] + '_time';
  }

  let model_pitches = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
  let model_octaves = [3, 4, 5, 6];
  let model_durations = ['1', '2', '4', '8', '16', '32'];
  let duration_codes = [undefined, 'double', 'whole', 'half', 'quarter', 'quarter', 'quarter', 'quarter'];
  let accidentals = ['is', 'es', 'isis', 'eses'];
  let duration_stems = [undefined, undefined, undefined, 1, 1, 2, 3, 4];
  let duration_rests = [undefined, 'double', 'whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond', 'sixtyfourth'];

  function model_notes_to_free(model) {
    return model.flatMap(model_item_to_free);
  } // TODO remove


  function make_time_signature(nb, value) {
    return nb * 100 + value * 1;
  }

  function time_nb_note_value(sig) {
    return Math.floor(sig / 100);
  }

  function time_note_value(sig) {
    return sig % 100;
  }

  function model_item_to_free(model) {
    if (Array.isArray(model)) {
      if (typeof model[0] === 'string') {
        let [command, rest] = model;

        if (command === 'clef') {
          return {
            clef: model_to_clef(rest)
          };
        } else if (command === 'time') {
          let [_nb_beats, _note_value] = rest.split('/');
          let time = make_time_signature(model_to_nb_beats(_nb_beats), model_to_note_value(_note_value));
          return {
            time
          };
        }
      } else {
        return [model.map(model_item_to_free)];
      }
    } else if (model === '|' || model === '||') {
      return model;
    } else {
      let {
        pitch,
        octave,
        dot,
        duration,
        text,
        accidental,
        tie
      } = model;

      let _pitch = model_pitches.indexOf(pitch) + 1;

      let _octave = model_octaves[octave];

      if (_pitch > 0) {
        if (!!_octave) {
          if (text) {
            return {
              pitch: _pitch,
              octave: _octave,
              klass: '',
              text
            };
          } else {
            let _duration = model_durations.indexOf(duration) + 1;

            let code = duration_codes[_duration];
            code += '_note';

            let _accidental = accidentals.indexOf(accidental) + 1 || undefined;

            return {
              code,
              pitch: _pitch,
              octave: _octave,
              ledger: true,
              tie: !!tie,
              dot: !!dot,
              klass: '',
              duration: _duration,
              accidental: _accidental
            };
          }
        }
      }
    }
  }

  const Music = props => {
    let {
      fen,
      zoom
    } = props;
    let music_model = read_fen(fen || '');

    if (music_model) {
      let {
        grandstaff
      } = music_model;
      let {
        staffs
      } = music_model;
      return (() => {
        const _el$ = _tmpl$2$1.cloneNode(true);

        _el$.style.setProperty("font-size", `${zoom || 1}em`);

        insert(_el$, createComponent(Switch, {
          get fallback() {
            return createComponent(For, {
              each: staffs,
              children: staff => createComponent(Staff, {
                staff: staff
              })
            });
          },

          get children() {
            return createComponent(Match, {
              when: !!grandstaff,

              get children() {
                const _el$2 = _tmpl$$1.cloneNode(true),
                      _el$3 = _el$2.firstChild,
                      _el$4 = _el$3.nextSibling;

                insert(_el$2, createComponent(For, {
                  get each() {
                    return grandstaff.staffs;
                  },

                  children: staff => createComponent(Staff, {
                    staff: staff
                  })
                }), _el$3);

                insert(_el$4, () => g['brace']);

                return _el$2;
              }

            });
          }

        }));

        return _el$;
      })();
    }
  };
  const Staff = props => {
    let {
      staff
    } = props;
    let notes = model_notes_to_free(staff.notes);
    return (() => {
      const _el$5 = _tmpl$3$1.cloneNode(true),
            _el$6 = _el$5.firstChild;
            _el$6.nextSibling;

      insert(_el$5, createComponent(For, {
        each: notes,
        children: (note_or_chord_or_bar, i) => createComponent(Switch, {
          get fallback() {
            return createComponent(FullOnStaff, {
              note: note_or_chord_or_bar,

              get i() {
                return i();
              }

            });
          },

          get children() {
            return [createComponent(Match, {
              when: note_or_chord_or_bar === '|',

              get children() {
                return createComponent(Bar, {
                  get i() {
                    return i();
                  }

                });
              }

            }), createComponent(Match, {
              when: note_or_chord_or_bar === '||',

              get children() {
                return createComponent(DoubleBar, {
                  get i() {
                    return i();
                  }

                });
              }

            }), createComponent(Match, {
              get when() {
                return Array.isArray(note_or_chord_or_bar);
              },

              children: createComponent(For, {
                each: note_or_chord_or_bar,
                children: note => createComponent(FullOnStaff, {
                  note: note,

                  get i() {
                    return i();
                  }

                })
              })
            }), createComponent(Match, {
              get when() {
                return !!note_or_chord_or_bar.clef;
              },

              get children() {
                return createComponent(FreeOnStaff, {
                  klass: '',

                  get pitch() {
                    return clef_to_pitch(note_or_chord_or_bar.clef);
                  },

                  octave: 4,
                  ox: 0.25,

                  get children() {
                    return g[clef_to_code(note_or_chord_or_bar.clef)];
                  }

                });
              }

            }), createComponent(Match, {
              get when() {
                return !!note_or_chord_or_bar.time;
              },

              get children() {
                return [createComponent(FreeOnStaff, {
                  klass: '',
                  pitch: 2,
                  octave: 5,

                  get ox() {
                    return (i() + 1) * 2 + (time_nb_note_value(note_or_chord_or_bar.time) >= 10 ? -0.25 : 0);
                  },

                  get children() {
                    return g[nb_note_value_to_code(time_nb_note_value(note_or_chord_or_bar.time))];
                  }

                }), createComponent(FreeOnStaff, {
                  klass: '',
                  pitch: 5,
                  octave: 4,

                  get ox() {
                    return (i() + 1) * 2;
                  },

                  get children() {
                    return g[note_value_to_code(time_note_value(note_or_chord_or_bar.time))];
                  }

                })];
              }

            })];
          }

        })
      }), null);

      return _el$5;
    })();
  };

  const Bar = props => {
    let {
      i,
      ox
    } = props;
    let x = (i + 1) * 2 + (ox || 0);
    let style$1 = {
      transform: `translate(${x}em, -50%) translateZ(0)`
    };
    return (() => {
      const _el$8 = _tmpl$4$1.cloneNode(true);

      style(_el$8, style$1);

      return _el$8;
    })();
  };

  const DoubleBar = props => {
    let {
      i
    } = props;
    return [createComponent(Bar, {
      i: i,
      ox: 0
    }), createComponent(Bar, {
      i: i,
      ox: 0.1
    })];
  };

  function transform_style(ox, oy) {
    return {
      transform: `translate(${ox}em, ${oy}em) translateZ(0)`
    };
  }

  let ledger_pitches = [undefined, [], [6, 4, 2], [6, 4], [6, 4], [6], [6], []];
  let ledger_pitches6 = [undefined, [1], [1], [1, 3], [1, 3], [1, 3, 5], [1, 3, 5], [1, 3, 5, 7]];

  function pitch_octave_ledgers(pitch, octave) {
    if (octave === 4 && pitch === 1) {
      return [[1, 4]];
    }

    if (octave === 3) {
      return [[1, 4], ...ledger_pitches[pitch].map(_ => [_, 3])];
    }

    if (octave === 5 && pitch > 5) {
      return [[6, 5]];
    }

    if (octave === 6) {
      return [[6, 5], ...ledger_pitches6[pitch].map(_ => [_, 6])];
    }

    return [];
  }

  const FullOnStaff = props => {
    let {
      note,
      i
    } = props;
    let ox = (i + 1) * 2;
    pitch_y(note.pitch, note.octave);
    let ledger_oys = note.ledger ? pitch_octave_ledgers(note.pitch, note.octave).map(_ => pitch_y(..._)) : [];
    return [createComponent(FreeOnStaff, {
      get klass() {
        return note.klass;
      },

      get pitch() {
        return note.pitch;
      },

      get octave() {
        return note.octave;
      },

      ox: ox,

      get oy() {
        return note.text ? -0.125 : 0;
      },

      get children() {
        return memo(() => !!note.code, true)() ? g[note.code] : (() => {
          const _el$9 = _tmpl$5$1.cloneNode(true);

          insert(_el$9, () => note.text);

          return _el$9;
        })();
      }

    }), createComponent(Index, {
      each: ledger_oys,
      children: _oy => (() => {
        const _el$10 = _tmpl$6$1.cloneNode(true);

        createRenderEffect(_$p => style(_el$10, transform_style(ox, _oy()), _$p));

        return _el$10;
      })()
    }), createComponent(Show, {
      get when() {
        return note.accidental;
      },

      get children() {
        return createComponent(Accidentals, {
          get klass() {
            return note.klass;
          },

          get pitch() {
            return note.pitch;
          },

          get octave() {
            return note.octave;
          },

          ox: ox,

          get accidental() {
            return note.accidental;
          }

        });
      }

    }), createComponent(Show, {
      get when() {
        return note.dot;
      },

      get children() {
        return createComponent(Dot, {
          get klass() {
            return note.klass;
          },

          get pitch() {
            return note.pitch;
          },

          get octave() {
            return note.octave;
          },

          ox: ox
        });
      }

    }), createComponent(Show, {
      get when() {
        return note.stem;
      },

      get children() {
        return createComponent(Stem, {
          get klass() {
            return note.klass;
          },

          get pitch() {
            return note.pitch;
          },

          get octave() {
            return note.octave;
          },

          ox: ox,

          get stem() {
            return note.stem;
          }

        });
      }

    })];
  };

  const Stem = props => {
    let {
      klass,
      pitch,
      octave,
      ox,
      stem
    } = props;
    let oy = pitch_y(pitch, octave);
    let style$1 = transform_style(ox, oy);
    let direction = Math.sign(stem);
    let d_klass = direction === -1 ? 'up' : 'down';
    return (() => {
      const _el$11 = _tmpl$7$1.cloneNode(true);

      style(_el$11, style$1);

      createRenderEffect(() => _el$11.className = ['stem', d_klass, klass].join(' '));

      return _el$11;
    })();
  };

  const Dot = props => {
    let {
      klass,
      pitch,
      octave,
      ox
    } = props;
    let oy = pitch_y(pitch, octave);
    let style$1 = transform_style(ox, oy);
    return (() => {
      const _el$12 = _tmpl$7$1.cloneNode(true);

      style(_el$12, style$1);

      createRenderEffect(() => _el$12.className = ['dot', klass].join(''));

      return _el$12;
    })();
  };

  const accidental_code = [undefined, 'sharp', 'flat', 'dsharp', 'dflat'];
  const accidental_offset = [0, 0.25, 0.25, 0.3, 0.4];

  const Accidentals = props => {
    let {
      klass,
      pitch,
      octave,
      ox,
      accidental
    } = props;
    let oy = pitch_y(pitch, octave);
    let style$1 = transform_style(ox - accidental_offset[accidental], oy);
    return (() => {
      const _el$13 = _tmpl$7$1.cloneNode(true);

      _el$13.className = klass;

      style(_el$13, style$1);

      insert(_el$13, () => g[accidental_code[accidental] + '_accidental']);

      return _el$13;
    })();
  };

  const FreeOnStaff = props => {
    let {
      klass,
      children,
      pitch,
      octave,
      ox,
      oy
    } = props;
    let x = ox || 0;
    let y = pitch_y(pitch, octave) + (oy || 0);
    let style$1 = {
      transform: `translate(${x}em, ${y}em) translateZ(0)`
    };
    return (() => {
      const _el$14 = _tmpl$7$1.cloneNode(true);

      _el$14.className = klass;

      style(_el$14, style$1);

      insert(_el$14, children);

      return _el$14;
    })();
  };
  const NotesDurationTable = props => {
    return (() => {
      const _el$15 = _tmpl$8$1.cloneNode(true),
            _el$16 = _el$15.firstChild,
            _el$17 = _el$16.firstChild,
            _el$18 = _el$17.nextSibling,
            _el$19 = _el$18.firstChild,
            _el$20 = _el$19.firstChild,
            _el$21 = _el$20.nextSibling,
            _el$22 = _el$21.nextSibling,
            _el$23 = _el$22.firstChild,
            _el$25 = _el$23.nextSibling;
            _el$25.nextSibling;
            const _el$26 = _el$22.nextSibling,
            _el$27 = _el$26.firstChild,
            _el$29 = _el$27.nextSibling;
            _el$29.nextSibling;
            const _el$30 = _el$26.nextSibling,
            _el$31 = _el$30.nextSibling,
            _el$32 = _el$19.nextSibling,
            _el$33 = _el$32.firstChild,
            _el$34 = _el$33.nextSibling,
            _el$35 = _el$34.nextSibling,
            _el$36 = _el$35.firstChild,
            _el$38 = _el$36.nextSibling;
            _el$38.nextSibling;
            const _el$39 = _el$35.nextSibling,
            _el$40 = _el$39.firstChild,
            _el$42 = _el$40.nextSibling;
            _el$42.nextSibling;
            const _el$43 = _el$39.nextSibling,
            _el$44 = _el$43.nextSibling,
            _el$45 = _el$32.nextSibling,
            _el$46 = _el$45.firstChild,
            _el$47 = _el$46.nextSibling,
            _el$48 = _el$47.nextSibling,
            _el$49 = _el$48.firstChild,
            _el$51 = _el$49.nextSibling;
            _el$51.nextSibling;
            const _el$52 = _el$48.nextSibling,
            _el$53 = _el$52.firstChild,
            _el$55 = _el$53.nextSibling;
            _el$55.nextSibling;
            const _el$56 = _el$52.nextSibling,
            _el$57 = _el$56.nextSibling,
            _el$58 = _el$45.nextSibling,
            _el$59 = _el$58.firstChild,
            _el$60 = _el$59.nextSibling,
            _el$61 = _el$60.nextSibling,
            _el$62 = _el$61.firstChild,
            _el$64 = _el$62.nextSibling;
            _el$64.nextSibling;
            const _el$65 = _el$61.nextSibling,
            _el$66 = _el$65.firstChild,
            _el$68 = _el$66.nextSibling;
            _el$68.nextSibling;
            const _el$69 = _el$65.nextSibling,
            _el$70 = _el$69.nextSibling,
            _el$71 = _el$58.nextSibling,
            _el$72 = _el$71.firstChild,
            _el$73 = _el$72.nextSibling,
            _el$74 = _el$73.nextSibling,
            _el$75 = _el$74.firstChild,
            _el$77 = _el$75.nextSibling;
            _el$77.nextSibling;
            const _el$78 = _el$74.nextSibling,
            _el$79 = _el$78.firstChild,
            _el$81 = _el$79.nextSibling;
            _el$81.nextSibling;
            const _el$82 = _el$71.nextSibling,
            _el$83 = _el$82.firstChild,
            _el$84 = _el$83.nextSibling,
            _el$85 = _el$84.nextSibling,
            _el$86 = _el$85.firstChild,
            _el$88 = _el$86.nextSibling;
            _el$88.nextSibling;
            const _el$89 = _el$85.nextSibling,
            _el$90 = _el$89.firstChild,
            _el$92 = _el$90.nextSibling;
            _el$92.nextSibling;
            const _el$93 = _el$82.nextSibling,
            _el$94 = _el$93.firstChild,
            _el$95 = _el$94.nextSibling,
            _el$96 = _el$95.nextSibling,
            _el$97 = _el$96.firstChild,
            _el$99 = _el$97.nextSibling;
            _el$99.nextSibling;
            const _el$100 = _el$96.nextSibling,
            _el$101 = _el$100.firstChild,
            _el$103 = _el$101.nextSibling;
            _el$103.nextSibling;

      insert(_el$22, createComponent(FullOnFreeStaff, {
        duration: 1
      }), _el$25);

      insert(_el$26, createComponent(FullOnFreeStaff, {
        rest: true,
        duration: 1,
        ox: 0.4
      }), _el$29);

      insert(_el$31, createComponent(FullOnFreeStaff, {
        duration: 2,
        ox: 0.1
      }), null);

      insert(_el$31, createComponent(FullOnFreeStaff, {
        duration: 2,
        ox: 0.6
      }), null);

      insert(_el$35, createComponent(FullOnFreeStaff, {
        duration: 2
      }), _el$38);

      insert(_el$39, createComponent(FullOnFreeStaff, {
        rest: true,
        duration: 2,
        ox: 0.4
      }), _el$42);

      insert(_el$44, createComponent(FullOnFreeStaff, {
        duration: 3,
        ox: 0.1
      }), null);

      insert(_el$44, createComponent(FullOnFreeStaff, {
        duration: 3,
        ox: 0.6
      }), null);

      insert(_el$48, createComponent(FullOnFreeStaff, {
        duration: 3
      }), _el$51);

      insert(_el$52, createComponent(FullOnFreeStaff, {
        rest: true,
        duration: 3,
        ox: 0.4
      }), _el$55);

      insert(_el$57, createComponent(FullOnFreeStaff, {
        duration: 4,
        ox: 0.1
      }), null);

      insert(_el$57, createComponent(FullOnFreeStaff, {
        duration: 4,
        ox: 0.6
      }), null);

      insert(_el$61, createComponent(FullOnFreeStaff, {
        duration: 4
      }), _el$64);

      insert(_el$65, createComponent(FullOnFreeStaff, {
        rest: true,
        duration: 4,
        ox: 0.4
      }), _el$68);

      insert(_el$70, createComponent(FullOnFreeStaff, {
        duration: 5,
        ox: 0.1
      }), null);

      insert(_el$70, createComponent(FullOnFreeStaff, {
        duration: 5,
        ox: 0.6
      }), null);

      insert(_el$74, createComponent(FullOnFreeStaff, {
        duration: 5
      }), _el$77);

      insert(_el$78, createComponent(FullOnFreeStaff, {
        rest: true,
        duration: 5,
        ox: 0.4
      }), _el$81);

      insert(_el$85, createComponent(FullOnFreeStaff, {
        duration: 6
      }), _el$88);

      insert(_el$89, createComponent(FullOnFreeStaff, {
        rest: true,
        duration: 6,
        ox: 0.4
      }), _el$92);

      insert(_el$96, createComponent(FullOnFreeStaff, {
        duration: 7
      }), _el$99);

      insert(_el$100, createComponent(FullOnFreeStaff, {
        rest: true,
        duration: 7,
        ox: 0.4
      }), _el$103);

      return _el$15;
    })();
  };
  const FullOnFreeStaff = props => {
    let {
      rest,
      duration,
      ox
    } = props;
    ox = ox === undefined ? 0.2 : ox;
    let pitch = rest ? 2 : 6;
    let octave = rest ? 7 : 6;
    let code = rest ? duration_rests[duration] + '_rest' : duration_codes[duration] + '_note';
    let stem = rest ? undefined : duration_stems[duration] * -1;

    let _klass = rest ? 'rest' : 'note';

    let d_klass = duration_rests[duration];
    let klass = [_klass, d_klass].join(' ');
    let note = {
      code,
      pitch,
      octave,
      klass,
      duration,
      stem
    };
    return (() => {
      const _el$104 = _tmpl$10$1.cloneNode(true);

      insert(_el$104, createComponent(Show, {
        when: !!rest,

        get children() {
          return _tmpl$9$1.cloneNode(true);
        }

      }), null);

      insert(_el$104, createComponent(FullOnStaff, {
        note: note,
        i: -1 + ox
      }), null);

      return _el$104;
    })();
  };
  let letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const PianoKeys = props => {
    let {
      n
    } = props;
    let style$1 = {
      width: `calc(${n} * 4em * 203/125)`
    };

    let _letters = [...Array(n)].flatMap(() => letters);

    function key_style(i) {
      return {
        transform: `translate(calc((${n} * 4em * 203/125) * ${i / (n * 7)}), calc(2.5em))`
      };
    }

    return (() => {
      const _el$106 = _tmpl$11$1.cloneNode(true),
            _el$107 = _el$106.firstChild;

      style(_el$107, style$1);

      insert(_el$106, createComponent(Index, {
        each: _letters,
        children: (letter, i) => (() => {
          const _el$108 = _tmpl$12$1.cloneNode(true);

          insert(_el$108, letter);

          createRenderEffect(_$p => style(_el$108, key_style(i), _$p));

          return _el$108;
        })()
      }), null);

      return _el$106;
    })();
  };

  const _tmpl$ = /*#__PURE__*/template(`<div class="solsido"></div>`),
        _tmpl$2 = /*#__PURE__*/template(`<ul><li> </li><li> </li><li> </li><li> </li></ul>`),
        _tmpl$3 = /*#__PURE__*/template(`<p> </p>`),
        _tmpl$4 = /*#__PURE__*/template(`<p></p>`),
        _tmpl$5 = /*#__PURE__*/template(`<p>Pitches are referred to by the seven letters of the alphabet <strong>A B C D E F G</strong>.</p>`),
        _tmpl$6 = /*#__PURE__*/template(`<p>Each key on a keyboard corresponds with a different pitch. The lowest pitch is on the far left, and each key to the right plays a successively higher pitch.</p>`),
        _tmpl$7 = /*#__PURE__*/template(`<p>. The curved line terminates at the second line designating the line as note G.</p>`),
        _tmpl$8 = /*#__PURE__*/template(`<p>Together the treble and bass staves make a <strong>grand staff</strong>.</p>`),
        _tmpl$9 = /*#__PURE__*/template(`<p>The lines of the treble clef from bottom to top are <strong>E G B D and F</strong> or "Every Good Boy Deserves Fruit". The spaces from bottom to top are <strong>F A C and E</strong> or "F A C E".</p>`),
        _tmpl$10 = /*#__PURE__*/template(`<p>Pitches that go beyond the limits of the staff are written by adding <strong>ledger lines</strong> above or below the staff.</p>`),
        _tmpl$11 = /*#__PURE__*/template(`<ul><li></li><li></li><li></li><li></li></ul>`),
        _tmpl$12 = /*#__PURE__*/template(`<small>The notion of step is discussed later.</small>`),
        _tmpl$13 = /*#__PURE__*/template(`<p>There are two useful intervals <strong>octave and semitone</strong>.</p>`),
        _tmpl$14 = /*#__PURE__*/template(`<p>There are eight white keys between and including two pitches an octave apart.</p>`),
        _tmpl$15 = /*#__PURE__*/template(`<p>The pattern of black and white keys repeats every octave on the keyboard. An octave is equal to 12 semitones (If you play all successive pitches between and including two pitches an octave apart, you would play 12 keys on the keyboard). Pitches an octave apart sound similar.</p>`),
        _tmpl$16 = /*#__PURE__*/template(`<p>The black keys on the keyboard, are named according to the adjacent white keys. Accidentals are used to indicate this adjacency. For example, black key between A and B can be referred to as A sharp or B flat.</p>`),
        _tmpl$17 = /*#__PURE__*/template(`<p>Sharps and flats are not exclusive to black keys. C is enharmonically equivalent to a B sharp, or E is enharmonically equivalent to an F flat.</p>`),
        _tmpl$18 = /*#__PURE__*/template(`<p>Accidentals apply to all other noteheads appearing on that line or space for the remainder of the measure, unless otherwise indicated. A natural accidental is used to cancel this convention.</p>`),
        _tmpl$19 = /*#__PURE__*/template(`<p><small>Accidentals are closely related to key signatures that is discussed later. </small></p>`),
        _tmpl$20 = /*#__PURE__*/template(`<h3>Duration, Meter and, Rhythm</h3>`),
        _tmpl$21 = /*#__PURE__*/template(`<p> Meter is regularly recurring pulses of equal duration, grouped in patterns of two, three, four etc. One of the pulses is accented, or strong. Pattern of strong and weak pulses are called <strong>beats</strong>. Duple (two beats) and triple (three beats) meter are two basic meters.</p>`),
        _tmpl$22 = /*#__PURE__*/template(`<p> <small>More on this later.</small></p>`),
        _tmpl$23 = /*#__PURE__*/template(`<p>Steady beats of a meter form <strong>measures</strong>, while rhythm can be any length.</p>`),
        _tmpl$24 = /*#__PURE__*/template(`<p>Each group of a meter is a <strong>measure or a bar</strong>. Vertical lines are <strong>measure lines or bar lines</strong>. Each measure is abbreviated as "m." and measures is abbreviated as "mm.".</p>`),
        _tmpl$25 = /*#__PURE__*/template(`<p>Music may start with a partial measure, called an <strong>anacrusis</strong>. It is not counted in the measure numbering.</p>`),
        _tmpl$26 = /*#__PURE__*/template(`<p>One whole note lasts as long as two half notes. One half note lasts as long as two quarter notes etc.</p>`),
        _tmpl$27 = /*#__PURE__*/template(`<p>Symbols for quarter notes and eight notes differ by addition of the <strong>flag</strong> attached to the stem of the eight note. Shorter durations can be written by adding more flags to the stem. Each additional flag divides the previous duration in half.</p>`),
        _tmpl$28 = /*#__PURE__*/template(`<p>Notes with flags are sometimes connected by <strong>beams</strong>. For clarifying the meter of the piece, and easier reading. Note that different durations can be beamed together as well.</p>`),
        _tmpl$29 = /*#__PURE__*/template(`<p>To express wider variety of rhthms, for example half a note followed by three quarter notes, we can use <strong>dots and ties</strong></p>`),
        _tmpl$30 = /*#__PURE__*/template(`<p>A dotted quarter note is equal to a regular quarter note plus an eight note. Rests can be dotted as well. </p>`),
        _tmpl$31 = /*#__PURE__*/template(`<p>Ties can be confused with <strong>slurs</strong>. <!> Rests cannot be tied.</p>`),
        _tmpl$32 = /*#__PURE__*/template(`<p> A meter that puts beats in groups of two is <strong>duple meter</strong> or in groups of three is <strong>triple meter</strong> and in groups of four is <strong>quadruple meter</strong>.</p>`),
        _tmpl$33 = /*#__PURE__*/template(`<p>A beat can also be divided. Each quarter note beat can be divided into two eight notes. Meters that divide the beat into twos are called <strong>simple meters</strong>. Meters that divide the beat into threes are called <strong>compound meters</strong>.</p>`),
        _tmpl$34 = /*#__PURE__*/template(`<p>For example a measure is divided in two beats thus duple meter, and each beat is divided into two, thus simple meter, or <strong>simple duple meter</strong>. A measure divided in two beats thus simple, each beat is divided into three thus compound, is <strong>simple compound meter</strong>.</p>`),
        _tmpl$35 = /*#__PURE__*/template(`<p>Some music may start with an incomplete or partial measure, that is called anacrusis or <strong>pickup measure</strong>.</p>`),
        _tmpl$36 = /*#__PURE__*/template(`<p>The meter may change in between measures, new meter is indicated by a new time signature.</p>`),
        _tmpl$37 = /*#__PURE__*/template(`<p>Any time signature where the top number is 2, 3, or 4 is a <strong>simple meter</strong>. For simple meters, top number indicates the number of beats per measure (duple, triple, or quadruple), and bottom number indicates the beat value. In a time signature of 3/4, 3 indicates that there are three beats per measure, and 4 indicates that each beat is the length of a quarter note. C is a time signature shorthand for 4/4 or <strong>common time</strong>. C/ is a time signature shorthand for 2/2 or <strong>cut time</strong>.</p>`),
        _tmpl$38 = /*#__PURE__*/template(`<p>For <strong>compound meters</strong> beat is divided into three equal durations. Each beat is a dotted note. The upper numbers are usually 6, 9 and, 12. In a time signature of 6/8, 8 indicates each beat is equal to a dotted quarter note, each measure has six eight notes, each beat is divided into three eight notes that is a dotted quarter note. To find the number of beats per measure, divide the top number by three. Thus 6/8 is duple meter, 9/8 is triple meter, 12/8 is quadruple meter. Since the bottom number indicates the duration of the beat division, add three of the bottom number to get the beat duration. In case of 6/8, the beat duration is three of eight notes which add up to a dotted quarter note. The beat duration (or unit) of a compound meter is always a dotted note.</p>`),
        _tmpl$39 = /*#__PURE__*/template(`<p>It can be a <strong>triplet or a duplet</strong>. A triplet represents, a ryhthmic borrowing from, (or a temporary shift to) the compound meter. A duplet is rythmic borrowing from the simple meter. For example in 3/4, beat can be divided into two eight notes. In 9/8, each beat can be divided into three eight notes. In 3/4, a triplet squeeze three eight notes into a beat as if it was 9/8. A duplet alters the ryhthm so that two notes take up the space that would normally accomodate three.</p>`),
        _tmpl$40 = /*#__PURE__*/template(`<ul><li><a href="https://milnepublishing.geneseo.edu/fundamentals-function-form/">Fundamentals, Function, and Form - Theory and Analysis of Tonal Western Art Music by Andre Mount</a></li><li><span>Music in Theory and Practice Volume 1 10th Edition by Bruce Benward</span></li><li><span>The Complete Musician An Integrated Approach to Theory, Analysis, and Listening Fourth Edition by Steven G. Laitz</span></li><li><a href="https://www.youtube.com/watch?v=ICDPWP6HUbk&list=PLw9t0oA3fHkxx1PgYpiXrMUPXaOiwh6KU">Dr. B Music Theory Lesson Youtube Playlist</a></li></ul>`),
        _tmpl$41 = /*#__PURE__*/template(`<p class="subtitle"></p>`),
        _tmpl$42 = /*#__PURE__*/template(`<strong></strong>`),
        _tmpl$43 = /*#__PURE__*/template(`<section><h2></h2></section>`);

  const App = () => {
    return (() => {
      const _el$ = _tmpl$.cloneNode(true);

      insert(_el$, createComponent(SoundSection, {}), null);

      insert(_el$, createComponent(NotationSection, {}), null);

      insert(_el$, createComponent(ReferencesSection, {}), null);

      return _el$;
    })();
  };

  const SoundSection = () => {
    return createComponent(Section, {
      title: "Sound",
      children: (() => {
        const _el$2 = _tmpl$2.cloneNode(true),
              _el$3 = _el$2.firstChild;
              _el$3.firstChild;
              const _el$5 = _el$3.nextSibling;
              _el$5.firstChild;
              const _el$7 = _el$5.nextSibling;
              _el$7.firstChild;
              const _el$9 = _el$7.nextSibling;
              _el$9.firstChild;

        insert(_el$3, createComponent(StrongItem, {
          title: "Pitch",
          children: "highness or lowness of the sound, determined by frequency."
        }));

        insert(_el$5, createComponent(StrongItem, {
          title: "Intensity",
          children: "loudness of the sound, determined by amplitude, measured in decibels."
        }));

        insert(_el$7, createComponent(StrongItem, {
          title: "Duration",
          children: "length of time a pitch is sounded."
        }));

        insert(_el$9, createComponent(StrongItem, {
          title: "Timbre",
          children: "quality or color of the sound, different instruments have different timbre."
        }));

        return _el$2;
      })()
    });
  };

  const NotationSection = () => {
    return createComponent(Section, {
      title: "Notation",

      get children() {
        return [(() => {
          const _el$11 = _tmpl$3.cloneNode(true);
                _el$11.firstChild;

          insert(_el$11, createComponent(StrongItem, {
            title: 'The staff',
            children: "is five equally spaced horizontal lines."
          }));

          return _el$11;
        })(), createComponent(Music, {
          zoom: '3'
        }), (() => {
          const _el$13 = _tmpl$4.cloneNode(true);

          insert(_el$13, createComponent(StrongItem, {
            title: 'Pitches',
            children: "are represented as symbols positioned on the staff."
          }));

          return _el$13;
        })(), _tmpl$5.cloneNode(true), createComponent(PianoKeys, {
          n: 3
        }), _tmpl$6.cloneNode(true), (() => {
          const _el$16 = _tmpl$4.cloneNode(true);

          insert(_el$16, createComponent(StrongItem, {
            title: 'A clef',
            children: "is a symbol placed at the beginning of the staff. It assigns one of the lines or spaces on a staff to a specific pitch."
          }));

          return _el$16;
        })(), (() => {
          const _el$17 = _tmpl$7.cloneNode(true),
                _el$18 = _el$17.firstChild;

          insert(_el$17, createComponent(StrongItem, {
            title: 'Treble clef or G clef',
            children: "symbol is a stylized G placed above middle C"
          }), _el$18);

          return _el$17;
        })(), createComponent(Music, {
          zoom: '3',
          fen: `{
/clef treble
g'"G" <a'"A" f'"F"> <b'"B" e'"E"> <c''"C" d'"D"> d''"D" e''"E" f''"F" g''"G" 
}`
        }), createComponent(Subtitle, {
          children: " Different note pitches are placed on a G clef staff "
        }), (() => {
          const _el$19 = _tmpl$4.cloneNode(true);

          insert(_el$19, createComponent(StrongItem, {
            title: 'Bass clef or F clef',
            children: "symbol is a stylized F. The dots are placed above and below the fourth line of staff, designating the line as an F."
          }));

          return _el$19;
        })(), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef bass
}`
        }), createComponent(Subtitle, {
          children: " Bass clef notes are placed different than treble clef. (To be implemented) "
        }), _tmpl$8.cloneNode(true), _tmpl$9.cloneNode(true), createComponent(Music, {
          zoom: '2',
          fen: `/new GrandStaff <<
{
/clef treble
<g'1 d"G"> <f'1 d"F"> <e'1 d"E"> <d'1 d"D"> <c'1 d"C" c'''"Middle C">
}
{
/clef bass
<d''1 d"F"> <e''1 d"G"> <f''1 d"A"> <g''1 d"B"> <a''1 d"C" e'''"Middle C">
}
>>`
        }), createComponent(Subtitle, {
          children: " Notes go from Bass Cleff to Treble Cleff on a Grand Staff "
        }), _tmpl$10.cloneNode(true), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
<c'1 c"C"> <b1 c"B"> <a1 c"A"> <g1 c"G"> <f1 c"F"> <a''1 a"A"> <b''1 a"B"> <c'''1 a"C"> <d'''1 a"D"> <e'''1 a"E">
}`
        }), createComponent(Subtitle, {
          children: " Notes with ledger lines "
        }), (() => {
          const _el$23 = _tmpl$4.cloneNode(true);

          insert(_el$23, createComponent(StrongItem, {
            title: 'Accidentals',
            children: "are symbols that are placed to the left of the noteheads to indicate raising or lowering the pitch."
          }));

          return _el$23;
        })(), (() => {
          const _el$24 = _tmpl$11.cloneNode(true),
                _el$25 = _el$24.firstChild,
                _el$26 = _el$25.nextSibling,
                _el$27 = _el$26.nextSibling,
                _el$28 = _el$27.nextSibling;

          insert(_el$25, createComponent(StrongItem, {
            title: 'Sharp',
            children: "raises the pitch a half step."
          }));

          insert(_el$26, createComponent(StrongItem, {
            title: 'Flat',
            children: "lowers the pitch a half step."
          }));

          insert(_el$27, createComponent(StrongItem, {
            title: 'Natural',
            children: "cancels any previous sharp or flat and returns to the natural, unaltered pitch."
          }));

          insert(_el$28, createComponent(StrongItem, {
            title: 'Double sharp, or double flat',
            children: "raises or lowers the pitch two half steps."
          }));

          return _el$24;
        })(), _tmpl$12.cloneNode(true), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
<gis'1 g"G Sharp"> <ges'1 g"G Flat"> <gisis'1 g"G Double Sharp"> <geses'1 g"G Double Flat">
}`
        }), createComponent(Subtitle, {
          children: "A note can have sharps, flats or natural"
        }), (() => {
          const _el$30 = _tmpl$4.cloneNode(true);

          insert(_el$30, createComponent(StrongItem, {
            title: 'An interval',
            children: "is the distance between two pitches."
          }));

          return _el$30;
        })(), _tmpl$13.cloneNode(true), (() => {
          const _el$32 = _tmpl$4.cloneNode(true);

          insert(_el$32, createComponent(StrongItem, {
            title: 'An Octave',
            children: "is the interval between a pitch and the next pitch above or below it with the same name."
          }));

          return _el$32;
        })(), _tmpl$14.cloneNode(true), (() => {
          const _el$34 = _tmpl$4.cloneNode(true);

          insert(_el$34, createComponent(StrongItem, {
            title: 'A semitone',
            children: "is the interval between adjacent keys on the keyboard."
          }));

          return _el$34;
        })(), _tmpl$15.cloneNode(true), _tmpl$16.cloneNode(true), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
c'1 cis' d' dis' e' f' fis' g' gis' a' ais' b' c''
}`
        }), createComponent(Subtitle, {
          children: "An octave of notes, increasing by a semitone."
        }), (() => {
          const _el$37 = _tmpl$4.cloneNode(true);

          insert(_el$37, createComponent(StrongItem, {
            title: 'Enharmonically equivalent',
            children: "names are when two different names refer to the same pitch."
          }));

          return _el$37;
        })(), _tmpl$17.cloneNode(true), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
cis'1 des' aes' gis' ais' bes' ees'' dis'' eis' f' bis' c'' bis' deses''
}`
        }), createComponent(Subtitle, {
          children: "Note that enharmonically equivalent notes sound the same."
        }), _tmpl$18.cloneNode(true), _tmpl$19.cloneNode(true), _tmpl$20.cloneNode(true), (() => {
          const _el$42 = _tmpl$21.cloneNode(true),
                _el$43 = _el$42.firstChild;

          insert(_el$42, createComponent(StrongItem, {
            title: 'Meter and rhythm',
            children: "are patterns of duration."
          }), _el$43);

          return _el$42;
        })(), _tmpl$22.cloneNode(true), (() => {
          const _el$45 = _tmpl$23.cloneNode(true),
                _el$46 = _el$45.firstChild;

          insert(_el$45, createComponent(StrongItem, {
            title: 'Rhythm',
            children: "is pattern of uneven durations."
          }), _el$46);

          return _el$45;
        })(), _tmpl$24.cloneNode(true), _tmpl$25.cloneNode(true), createComponent(NotesDurationTable, {}), createComponent(Subtitle, {
          children: "The notation of duration for notes and rests"
        }), _tmpl$26.cloneNode(true), _tmpl$27.cloneNode(true), _tmpl$28.cloneNode(true), _tmpl$29.cloneNode(true), (() => {
          const _el$53 = _tmpl$4.cloneNode(true);

          insert(_el$53, createComponent(StrongItem, {
            title: 'A tie',
            children: "is a curved line that connects two adjacent notes, with the same pitch, that sounds as single sound duration of both note values."
          }));

          return _el$53;
        })(), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
c''~ c''4 | c''2
}`
        }), createComponent(Subtitle, {
          children: "Tied quarter notes are equal to the half note"
        }), (() => {
          const _el$54 = _tmpl$30.cloneNode(true),
                _el$55 = _el$54.firstChild;

          insert(_el$54, createComponent(StrongItem, {
            title: 'A dot',
            children: "is placed right of a note head. It lengthens the value of the note by half of it's note value."
          }), _el$55);

          insert(_el$54, createComponent(StrongItem, {
            title: 'A double dotted note',
            children: "the second dot adds half of the value added by the first note."
          }), null);

          return _el$54;
        })(), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
a'2. | a'2~ a'4
}`
        }), createComponent(Subtitle, {
          children: "Tied quarter notes are equal to the half note"
        }), (() => {
          const _el$56 = _tmpl$31.cloneNode(true),
                _el$57 = _el$56.firstChild,
                _el$58 = _el$57.nextSibling,
                _el$59 = _el$58.nextSibling,
                _el$61 = _el$59.nextSibling;
                _el$61.nextSibling;

          insert(_el$56, createComponent(StrongItem, {
            title: 'A slur',
            children: "is similar to a tie except it connects different pitches."
          }), _el$61);

          return _el$56;
        })(), (() => {
          const _el$62 = _tmpl$32.cloneNode(true),
                _el$63 = _el$62.firstChild;

          insert(_el$62, createComponent(StrongItem, {
            title: 'Meter',
            children: "is how beats are organized."
          }), _el$63);

          return _el$62;
        })(), _tmpl$33.cloneNode(true), _tmpl$34.cloneNode(true), _tmpl$35.cloneNode(true), (() => {
          const _el$67 = _tmpl$36.cloneNode(true),
                _el$68 = _el$67.firstChild;

          insert(_el$67, createComponent(StrongItem, {
            title: 'Time signature',
            children: "is pair of large numbers at the beginning of the first line of staff. They indicate the meter of the music."
          }), _el$68);

          return _el$67;
        })(), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
/time 2/2 
|| 
/time 3/2 
|| 
/time 4/2 
|| 
/time 3/4 
|| 
/time 4/4 
|| 
/time 6/8 
|| 
/time 9/8 
|| 
/time 12/8 
}`
        }), createComponent(Subtitle, {
          children: " Time signatures with 6 simple meter and 3 compound meter. "
        }), _tmpl$37.cloneNode(true), createComponent(Music, {
          zoom: '2',
          fen: `{
/clef treble
/time 3/4
<b' b''"Beats" a"1"> <b' a"2"> <b' a"3"> | <b'8 b''"Beats divided" a"1"> b'8 <b'8 a"2"> b'8 <b'16 b''"Beats subdivided" a"3"> b'16 b'16 b'16

} {
/clef treble
/time 3/2
<b'2 b''"Beats" a"1"> <b'2 a"2"> <b'2 a"3"> | <b'4 b''"Beats divided" a"1"> b'4 <b'4 a"2"> b'4 <b'8 a"3"> b'8 b'8 b'8
}`
        }), "// TODO REST", createComponent(Subtitle, {
          children: " First measure, a full note for each beat, and next measure, beats are divided and further subdivided "
        }), _tmpl$38.cloneNode(true), (() => {
          const _el$71 = _tmpl$39.cloneNode(true),
                _el$72 = _el$71.firstChild;

          insert(_el$71, createComponent(StrongItem, {
            title: 'Tuplets',
            children: "is a generic term for rhythmic alteration."
          }), _el$72);

          return _el$71;
        })()];
      }

    });
  };

  const ReferencesSection = () => {
    return createComponent(Section, {
      title: "References",
      children: _tmpl$40.cloneNode(true)
    });
  };

  const Subtitle = props => {
    return (() => {
      const _el$74 = _tmpl$41.cloneNode(true);

      insert(_el$74, () => props.children);

      return _el$74;
    })();
  };

  const StrongItem = props => {
    return [" ", (() => {
      const _el$75 = _tmpl$42.cloneNode(true);

      insert(_el$75, () => props.title);

      return _el$75;
    })(), " ", memo(() => props.children), " "];
  };

  const Section = props => {
    return (() => {
      const _el$76 = _tmpl$43.cloneNode(true),
            _el$77 = _el$76.firstChild;

      insert(_el$77, () => props.title);

      insert(_el$76, () => props.children, null);

      return _el$76;
    })();
  };

  function Solsido(element, config) {
    render(App, element);
  }

  return Solsido;

})();
//# sourceMappingURL=main.js.map
