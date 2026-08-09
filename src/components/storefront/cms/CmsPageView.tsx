import Image from "next/image";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import {
  stringField,
  privacySections,
  type CmsPageContent,
  type CmsPageSlug,
} from "@/lib/cms/cms-pages";

interface CmsPageViewProps {
  slug: CmsPageSlug;
  content: CmsPageContent;
}

export function CmsPageView({ slug, content }: CmsPageViewProps) {
  if (slug === "about") return <AboutView content={content} />;
  if (slug === "contact") return <ContactView content={content} />;
  return <PrivacyView content={content} />;
}

function AboutView({ content }: { content: CmsPageContent }) {
  const heroImage = stringField(content, "heroImage");

  return (
    <article className="cms-page">
      <header className="cms-page__hero">
        {heroImage && (
          <div className="cms-page__hero-media">
            <Image
              src={heroImage}
              alt={stringField(content, "heroTitle")}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1200px"
              priority
            />
            <div className="cms-page__hero-overlay" />
          </div>
        )}
        <div className="cms-page__hero-copy">
          <h1 className="cms-page__title">{stringField(content, "heroTitle")}</h1>
          {stringField(content, "heroSubtitle") && (
            <p className="cms-page__lead">{stringField(content, "heroSubtitle")}</p>
          )}
        </div>
      </header>

      <div className="cms-page__body">
        <section className="cms-page__section">
          <h2 className="cms-page__section-title">{stringField(content, "introTitle")}</h2>
          <p className="cms-page__prose">{stringField(content, "introBody")}</p>
        </section>

        <section className="cms-page__section cms-page__section--muted">
          <h2 className="cms-page__section-title">{stringField(content, "missionTitle")}</h2>
          <p className="cms-page__prose">{stringField(content, "missionBody")}</p>
        </section>

        <section className="cms-page__section">
          <h2 className="cms-page__section-title">{stringField(content, "valuesTitle")}</h2>
          <div className="cms-page__values-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="cms-page__value-card">
                <h3 className="cms-page__value-title">
                  {stringField(content, `value${n}Title`)}
                </h3>
                <p className="cms-page__prose">{stringField(content, `value${n}Body`)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}

function ContactView({ content }: { content: CmsPageContent }) {
  const email = stringField(content, "email");
  const phone = stringField(content, "phone");
  const address = stringField(content, "address");
  const hours = stringField(content, "hours");

  return (
    <article className="cms-page">
      <header className="cms-page__header">
        <h1 className="cms-page__title">{stringField(content, "pageTitle")}</h1>
        {stringField(content, "intro") && (
          <p className="cms-page__lead">{stringField(content, "intro")}</p>
        )}
      </header>

      <div className="cms-page__contact-grid">
        {email && (
          <div className="cms-page__contact-card">
            <Mail className="cms-page__contact-icon" aria-hidden />
            <h2 className="cms-page__contact-label">{stringField(content, "emailLabel")}</h2>
            <a href={`mailto:${email}`} className="cms-page__contact-value">
              {email}
            </a>
          </div>
        )}
        {phone && (
          <div className="cms-page__contact-card">
            <Phone className="cms-page__contact-icon" aria-hidden />
            <h2 className="cms-page__contact-label">{stringField(content, "phoneLabel")}</h2>
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="cms-page__contact-value">
              {phone}
            </a>
          </div>
        )}
        {address && (
          <div className="cms-page__contact-card">
            <MapPin className="cms-page__contact-icon" aria-hidden />
            <h2 className="cms-page__contact-label">{stringField(content, "addressLabel")}</h2>
            <p className="cms-page__contact-value cms-page__contact-value--multiline">
              {address.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < address.split("\n").length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>
        )}
        {hours && (
          <div className="cms-page__contact-card">
            <Clock className="cms-page__contact-icon" aria-hidden />
            <h2 className="cms-page__contact-label">{stringField(content, "hoursLabel")}</h2>
            <p className="cms-page__contact-value cms-page__contact-value--multiline">
              {hours.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < hours.split("\n").length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      {stringField(content, "responseNote") && (
        <p className="cms-page__footnote">{stringField(content, "responseNote")}</p>
      )}
    </article>
  );
}

function PrivacyView({ content }: { content: CmsPageContent }) {
  const sections = privacySections(content);

  return (
    <article className="cms-page">
      <header className="cms-page__header">
        <h1 className="cms-page__title">{stringField(content, "pageTitle")}</h1>
        {stringField(content, "lastUpdated") && (
          <p className="cms-page__meta">{stringField(content, "lastUpdated")}</p>
        )}
        {stringField(content, "intro") && (
          <p className="cms-page__lead">{stringField(content, "intro")}</p>
        )}
      </header>

      <div className="cms-page__body">
        {sections.map((section, i) => (
          <section key={i} className="cms-page__section">
            <h2 className="cms-page__section-title">{section.title}</h2>
            <p className="cms-page__prose">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
