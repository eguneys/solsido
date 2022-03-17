export const Link = (props) => {

  let { href, children } = props

  return (
    <a
    href={href}
    onClick={(e) => {
      e.preventDefault()
    }}>{children}</a>)
}
