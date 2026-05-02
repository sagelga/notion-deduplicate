export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_EN: FAQItem[] = [
  {
    q: "Does Notion have built-in duplicate detection?",
    a: "No. Notion does not have any native feature to detect or remove duplicate pages. You need a third-party tool like notion-tools to find and clean up duplicates.",
  },
  {
    q: "How does notion-tools find duplicates?",
    a: "You select a Notion database and choose a field (like a title or ID) to group pages by. notion-tools then identifies pages that share the same value in that field, keeping the newest one and flagging the rest for deletion.",
  },
  {
    q: "Is my data safe? Do you store my Notion content?",
    a: "No. notion-tools never stores, copies, or logs your Notion content. All processing happens in your browser — your data stays between you and Notion's API. We use OAuth and httpOnly cookies for authentication, with no server-side session storage.",
  },
  {
    q: "What happens to the pages you delete?",
    a: " notion-tools permanently deletes the duplicate pages via the Notion API. Deleted pages go to Notion's trash and can be recovered from there within 30 days. Only the pages you explicitly select are removed — your original page is always kept.",
  },
  {
    q: "Which Notion plans can use notion-tools?",
    a: "Any Notion plan that supports API integrations — including Free, Plus, Business, and Enterprise. You just need to create a Notion integration and share the relevant databases with it.",
  },
  {
    q: "Can I preview what will be deleted before confirming?",
    a: "Yes. notion-tools always shows you a full preview of duplicate groups before any deletion happens. You can review, adjust the grouping field, or deselect individual pages before confirming.",
  },
  {
    q: "How does the Agenda view sync with Notion?",
    a: "The Agenda view reads from your Notion databases in real-time. Any changes you make in Notion (new tasks, due date changes, completions) are reflected in Agenda on the next sync. All data stays in your browser — nothing is stored on our servers.",
  },
];

export const FAQ_TH: FAQItem[] = [
  {
    q: "Notion มีระบบตรวจจับหน้าซ้ำในตัวไหม?",
    a: "ไม่ครับ Notion ไม่มีฟีเจอร์ในตัวสำหรับตรวจจับหรือลบหน้าที่ซ้ำกัน คุณต้องใช้เครื่องมือจากภายนอกอย่าง notion-tools เพื่อค้นหาและลบหน้าที่ซ้ำ",
  },
  {
    q: "notion-tools ค้นหาหน้าซ้ำอย่างไร?",
    a: "คุณเลือกฐานข้อมูล Notion และเลือกฟิลด์ (เช่น ชื่อเรื่อง หรือ ID) เพื่อจัดกลุ่มหน้า notion-tools จะค้นหาหน้าที่มีค่าเดียวกันในฟิลด์นั้น โดยเก็บหน้าที่ใหม่ที่สุดไว้ และทำเครื่องหมายหน้าอื่นๆ เพื่อลบ",
  },
  {
    q: "ข้อมูลของฉันปลอดภัยไหม? คุณเก็บเนื้อหา Notion ไว้ไหม?",
    a: "ไม่ครับ notion-tools ไม่เคยจัดเก็บ คัดลอก หรือบันทึกเนื้อหา Notion ของคุณ การประมวลผลทั้งหมดเกิดขึ้นในเบราว์เซอร์ของคุณ — ข้อมูลของคุณอยู่ระหว่างคุณและ Notion API เท่านั้น เราใช้ OAuth และ httpOnly cookies สำหรับการยืนยันตัวตน โดยไม่มีการจัดเก็บเซสชันบนเซิร์ฟเวอร์",
  },
  {
    q: "หน้าที่ถูกลบไปจะเป็นอย่างไร?",
    a: "notion-tools จะลบหน้าที่ซ้ำอย่างถาวรผ่าน Notion API หน้าที่ลบจะไปอยู่ในถังขยะของ Notion และสามารถกู้คืนได้ภายใน 30 วัน มีเพียงหน้าที่คุณเลือกเท่านั้นที่จะถูกลบ — หน้าต้นฉบับของคุณจะถูกเก็บไว้เสมอ",
  },
  {
    q: "แพลน Notion ไหนใช้ notion-tools ได้บ้าง?",
    a: "ทุกแพลนของ Notion ที่รองรับการเชื่อมต่อ API — รวมถึง Free, Plus, Business และ Enterprise คุณเพียงแค่ต้องสร้าง Notion integration และแชร์ฐานข้อมูลที่เกี่ยวข้องกับมัน",
  },
  {
    q: "ฉันดูตัวอย่างสิ่งที่จะถูกลบก่อนยืนยันได้ไหม?",
    a: "ได้ครับ notion-tools จะแสดงตัวอย่างเต็มของกลุ่มหน้าที่ซ้ำกันก่อนที่การลบจะเกิดขึ้นเสมอ คุณสามารถตรวจสอบ ปรับฟิลด์ที่ใช้จัดกลุ่ม หรือยกเลิกเลือกหน้าเฉพาะก่อนยืนยัน",
  },
  {
    q: "มุมมอง Agenda ซิงค์กับ Notion อย่างไร?",
    a: "มุมมอง Agenda อ่านข้อมูลจากฐานข้อมูล Notion ของคุณแบบเรียลไทม์ การเปลี่ยนแปลงใดๆ ที่คุณทำใน Notion (งานใหม่ วันที่ สถานะ) จะแสดงใน Agenda เมื่อซิงค์ครั้งต่อไป ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์ของคุณ — ไม่มีการจัดเก็บบนเซิร์ฟเวอร์ของเรา",
  },
];

export function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ...FAQ_EN.map((item) => ({
        "@type": "Question" as const,
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer" as const,
          text: item.a,
        },
      })),
      ...FAQ_TH.map((item) => ({
        "@type": "Question" as const,
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer" as const,
          text: item.a,
        },
      })),
    ],
  };
}