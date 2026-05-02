"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { FAQ_EN, FAQ_TH, buildFaqJsonLd } from "@/config/faq-data";
import "./faq.css";

export default function FaqPage() {
  const { language } = useLanguage();
  const faqs = language === "th" ? FAQ_TH : FAQ_EN;
  const jsonLd = buildFaqJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="faq-wrapper">
        <div className="faq-hero">
          <h1 className="faq-title">
            {language === "th" ? "คำถามที่พบบ่อย" : "Frequently Asked Questions"}
          </h1>
          <p className="faq-subtitle">
            {language === "th"
              ? "คำตอบสำหรับคำถามที่พบบ่อยเกี่ยวกับ notion-tools"
              : "Common questions about notion-tools, duplicate detection, and Notion integration."}
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((item, i) => (
            <div key={i} className="faq-item">
              <h2 className="faq-question">{item.q}</h2>
              <p className="faq-answer">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}