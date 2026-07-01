// Signature visual element: a perforated, instant-print photo strip.
// Used on the landing hero (with placeholder blocks), the filter picker,
// and the final result page.
export default function PhotoStrip({ shots, filterCss = 'none', footer, placeholder, style }) {
  const items = shots && shots.length ? shots : placeholder || [];

  return (
    <div className="strip-frame" style={style}>
      <div className="strip-frame__photos">
        {items.map((item, i) => (
          <div className="strip-frame__shot" key={i}>
            {typeof item === 'string' ? (
              <img src={item} alt={`Shot ${i + 1}`} style={{ filter: filterCss }} />
            ) : (
              item
            )}
          </div>
        ))}
      </div>
      {footer && (
        <div className="strip-frame__footer">
          <div className="strip-frame__names">{footer.names}</div>
          <div className="strip-frame__date">{footer.date}</div>
        </div>
      )}
    </div>
  );
}
