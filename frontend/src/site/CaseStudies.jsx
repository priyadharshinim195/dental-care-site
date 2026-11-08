import { useEffect, useRef, useState } from "react";

/* Converts a published API case into the public card shape. */
export function toCardModel(caseStudy, position) {
  const byKind = (kind) => caseStudy.images.find((img) => img.kind === kind) || null;
  const before = byKind("before");
  const after = byKind("after");
  const number = String(position + 1).padStart(2, "0");
  return {
    id: caseStudy.slug,
    number: `Case Study ${number}`,
    cardCategory: caseStudy.category,
    cardTitle: caseStudy.title,
    overview: caseStudy.summary || caseStudy.description,
    introduction: caseStudy.description,
    treatmentDetails: caseStudy.treatment_details,
    before,
    after,
    xrayImages: caseStudy.images.filter((image) => image.kind === "xray"),
    surgeryImages: caseStudy.images.filter((image) => image.kind === "surgery"),
    details: [
      ["Challenge", caseStudy.challenge],
      ["Solution", caseStudy.solution],
      ["Final Result", caseStudy.result],
    ].filter(([, text]) => text && text.trim()),
  };
}

export function BeforeAfter({ before, after, className = "" }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const pointerId = useRef(null);

  const updatePosition = (event) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width) return;
    setPosition(Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100)));
  };

  const onPointerDown = (event) => {
    event.preventDefault();
    pointerId.current = event.pointerId;
    if (event.isTrusted) event.currentTarget.setPointerCapture?.(event.pointerId);
    updatePosition(event);
  };

  const onPointerMove = (event) => {
    if (pointerId.current === event.pointerId) updatePosition(event);
  };

  const onPointerUp = (event) => {
    if (pointerId.current === event.pointerId) pointerId.current = null;
  };

  const onKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setPosition((value) => Math.max(0, value - step));
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setPosition((value) => Math.min(100, value + step));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPosition(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setPosition(100);
    }
  };

  return (
    <div className={`ba-compare${className ? ` ${className}` : ""}`} ref={containerRef}
      style={{ "--ba-position": `${position}%` }}>
      <img className="ba-img ba-img-after" src={after.url} alt={after.alt || "After treatment"} loading="lazy" decoding="async" />
      <div className="ba-before">
        <img className="ba-img ba-img-before" src={before.url} alt={before.alt || "Before treatment"} loading="lazy" decoding="async" />
      </div>
      <span className="ba-label ba-label-before">Before</span>
      <span className="ba-label ba-label-after">After</span>
      <span className="ba-divider-line" aria-hidden="true" />
      <div className="ba-handle" role="slider" tabIndex={0} aria-label="Compare before and after"
        aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% before visible`}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp} onKeyDown={onKeyDown}>
        <span aria-hidden="true">↔</span>
      </div>
    </div>
  );
}

function CaseMedia({ item, className = "" }) {
  if (!item.before || !item.after) return null;
  return <BeforeAfter before={item.before} after={item.after} className={className} />;
}

function CaseCard({ item, onOpen }) {
  return (
    <article className="case-study-card" data-case-card={item.id}>
      <CaseMedia item={item} className="case-study-comparison" />
      <div className="case-study-body">
        {item.cardCategory && <p className="case-study-category">{item.cardCategory}</p>}
        <h3>{item.cardTitle}</h3>
        {item.overview && <p className="case-study-description">{item.overview}</p>}
        <button type="button" className="case-study-link" onClick={() => onOpen(item)}>
          View Case Study <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="case-study-treatment-link" onClick={() => onOpen(item, "treatment")}>
          View Treatment Details
        </button>
      </div>
    </article>
  );
}

function CaseGallery({ title, images, kind }) {
  if (!images.length) return null;
  return (
    <section className="case-dialog-section">
      <h3>{title}</h3>
      <div className="case-treatment-gallery">
        {images.map((image, index) => (
          <figure key={image.id || `${kind}-${index}-${image.url}`}>
            <img src={image.url} alt={image.alt || `${title} image ${index + 1}`} loading="lazy" decoding="async" />
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function CaseDialog({ item, mode, onClose }) {
  const ref = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item) {
      opener.current = document.activeElement;
      if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [item]);

  const handleClose = () => {
    onClose();
    if (opener.current && opener.current.focus) opener.current.focus();
  };

  return (
    <dialog className="case-dialog" ref={ref} aria-labelledby="caseDialogTitle"
      onClick={(event) => event.target === ref.current && handleClose()}
      onCancel={(event) => { event.preventDefault(); handleClose(); }}
      onClose={() => item && handleClose()}>
      {item && (
        <article className={`case-dialog-panel${mode === "treatment" ? " case-treatment-panel" : ""}`}>
          <button className="case-dialog-close" type="button"
            aria-label={mode === "treatment" ? "Close treatment details" : "Close case study"} onClick={handleClose}>×</button>
          {mode === "treatment" ? (
            <div className="case-dialog-content case-dialog-treatment-content">
              <h2 id="caseDialogTitle">{item.cardTitle}</h2>
              <section className="case-dialog-section">
                <h3>Before &amp; After</h3>
                <CaseMedia item={item} className="case-treatment-comparison" />
              </section>
              <CaseGallery title="X-Ray Images" images={item.xrayImages} kind="xray" />
              <CaseGallery title="During Surgery" images={item.surgeryImages} kind="surgery" />
              <section className="case-dialog-section">
                <h3>Case Description</h3>
                {item.introduction && <p className="case-dialog-intro">{item.introduction}</p>}
                {item.treatmentDetails && <p className="case-dialog-intro">{item.treatmentDetails}</p>}
              </section>
              <button className="btn btn-outline-light case-dialog-back" type="button" onClick={handleClose}>
                Back to Case Studies
              </button>
            </div>
          ) : (
            <>
              <div className="case-dialog-media"><CaseMedia item={item} className="case-dialog-comparison" /></div>
              <div className="case-dialog-content">
                {item.cardCategory && <p className="case-category">{item.cardCategory}</p>}
                <h2 id="caseDialogTitle">{item.cardTitle}</h2>
                {item.introduction && <p className="case-dialog-intro">{item.introduction}</p>}
                <div className="case-dialog-details">
                  {item.details.map(([heading, text]) => (
                    <section key={heading}><h3>{heading}</h3><p>{text}</p></section>
                  ))}
                </div>
                <button className="btn btn-outline-light case-dialog-back" type="button" onClick={handleClose}>
                  Back to Case Studies
                </button>
              </div>
            </>
          )}
        </article>
      )}
    </dialog>
  );
}

export default function CaseStudies({
  content, publishedCases, limit, page = false,
}) {
  const allItems = (publishedCases || [])
    .filter((study) => study.images.some((image) => image.kind === "before")
      && study.images.some((image) => image.kind === "after"))
    .map((study, index) => toCardModel(study, index));
  const items = limit === undefined ? allItems : allItems.slice(0, limit);
  const [open, setOpen] = useState(null);

  return (
    <section className={`section cases${page ? " cases-page" : ""}`} id="case-studies" aria-labelledby="casesTitle">
      <div className="container">
        {page && (
          <div className="case-page-back-wrap">
            <a className="btn btn-primary case-study-explore case-page-back" href="/#case-studies">
              <span aria-hidden="true">←</span> Back to Case Studies
            </a>
          </div>
        )}
        <header className="section-head center">
          <p className="eyebrow">{page ? "Case Studies" : content["cases.eyebrow"]}</p>
          <h2 id="casesTitle" className="section-title">
            {page ? "All Case Studies" : content["cases.title"]}
          </h2>
          <p className="section-sub">
            {page ? "Explore our published before-and-after case studies." : content["cases.sub"]}
          </p>
        </header>
        {items.length > 0 ? (
          <div className="case-grid">
            {items.map((item) => (
              <CaseCard key={item.id} item={item}
                onOpen={(selected, view = "case") => setOpen({ item: selected, view })} />
            ))}
          </div>
        ) : (
          <p className="case-study-empty">Verified before-and-after case studies will appear here once they are published.</p>
        )}
        {limit !== undefined && allItems.length > limit && (
          <div className="case-study-explore-wrap">
            <a className="btn btn-primary case-study-explore" href="/case-studies/">
              Explore All Cases <span aria-hidden="true">→</span>
            </a>
          </div>
        )}
      </div>
      <CaseDialog item={open?.item} mode={open?.view} onClose={() => setOpen(null)} />
    </section>
  );
}

export function CaseStudiesPage({ content, publishedCases }) {
  return <CaseStudies content={content} publishedCases={publishedCases} page />;
}
