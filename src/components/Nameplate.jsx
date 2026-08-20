/**
 * The riveted equipment plate. Mirrors the data plate physically attached to
 * the instrument, so the screen and the object agree.
 */
export default function Nameplate({ code, name }) {
  return (
    <div className="nameplate">
      <div className="plate-eyebrow">Unique Code</div>
      <p className="plate-code">{code}</p>
      <p className="plate-name">{name || 'Unnamed instrument'}</p>
    </div>
  )
}
