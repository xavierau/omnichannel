import type { WhatsAppTemplate, WhatsAppTemplateGroup, TemplateTranslation } from "../types"

// NEW: Grouped template structure with translations
export const mockTemplateGroups: WhatsAppTemplateGroup[] = [
  // Marketing Templates
  {
    id: "grp_001",
    name: "holiday_sale_announcement",
    category: "MARKETING",
    createdAt: new Date("2024-11-15T10:00:00"),
    updatedAt: new Date("2024-11-20T14:30:00"),
    translations: [
      {
        id: "trans_001_en",
        language: "en",
        status: "APPROVED",
        quality: "HIGH",
        header: {
          type: "IMAGE",
          mediaUrl: "https://example.com/holiday-sale.jpg",
        },
        body: "Hi {{1}}! Our Holiday Sale is here! Get up to {{2}}% off on all items. Shop now and save big! Use code: {{3}} at checkout. Valid until {{4}}.",
        footer: "Reply STOP to unsubscribe",
        buttons: [
          { id: "btn_001", type: "URL", text: "Shop Now", url: "https://example.com/sale" },
          { id: "btn_002", type: "QUICK_REPLY", text: "View Catalog" },
        ],
        createdAt: new Date("2024-11-15T10:00:00"),
        updatedAt: new Date("2024-11-20T14:30:00"),
      },
      {
        id: "trans_001_es",
        language: "es",
        status: "APPROVED",
        quality: "HIGH",
        header: {
          type: "IMAGE",
          mediaUrl: "https://example.com/promo-es.jpg",
        },
        body: "Hola {{1}}! Tenemos una oferta especial para ti. Obtén {{2}}% de descuento en tu próxima compra. Usa el código: {{3}}",
        footer: "Responde PARAR para cancelar",
        buttons: [
          { id: "btn_008", type: "URL", text: "Comprar Ahora", url: "https://example.com/es/shop" },
        ],
        createdAt: new Date("2024-11-12T12:00:00"),
        updatedAt: new Date("2024-11-14T09:15:00"),
      },
      {
        id: "trans_001_zh_hk",
        language: "zh_HK",
        status: "PENDING",
        header: {
          type: "IMAGE",
          mediaUrl: "https://example.com/promo-hk.jpg",
        },
        body: "您好 {{1}}！限時優惠！全場{{2}}折起，優惠碼：{{3}}，有效期至{{4}}。",
        footer: "回覆STOP取消訂閱",
        buttons: [
          { id: "btn_025", type: "URL", text: "立即選購", url: "https://example.com/hk/shop" },
        ],
        createdAt: new Date("2024-11-05T11:00:00"),
        updatedAt: new Date("2024-11-15T14:30:00"),
      },
    ],
  },
  {
    id: "grp_002",
    name: "new_product_launch",
    category: "MARKETING",
    createdAt: new Date("2024-11-10T09:00:00"),
    updatedAt: new Date("2024-11-18T11:45:00"),
    translations: [
      {
        id: "trans_002_en",
        language: "en",
        status: "APPROVED",
        quality: "MEDIUM",
        header: {
          type: "VIDEO",
          mediaUrl: "https://example.com/product-launch.mp4",
        },
        body: "Introducing our latest innovation! {{1}} is now available. Be among the first to experience {{2}}. Limited quantities available!",
        footer: "Exclusive for our valued customers",
        buttons: [
          { id: "btn_003", type: "URL", text: "Pre-order Now", url: "https://example.com/preorder" },
          { id: "btn_004", type: "QUICK_REPLY", text: "Learn More" },
          { id: "btn_005", type: "QUICK_REPLY", text: "Not Interested" },
        ],
        createdAt: new Date("2024-11-10T09:00:00"),
        updatedAt: new Date("2024-11-18T11:45:00"),
      },
    ],
  },
  {
    id: "grp_003",
    name: "customer_reengagement",
    category: "MARKETING",
    createdAt: new Date("2024-11-25T16:00:00"),
    updatedAt: new Date("2024-11-25T16:00:00"),
    translations: [
      {
        id: "trans_003_en",
        language: "en",
        status: "PENDING",
        header: {
          type: "TEXT",
          text: "We Miss You!",
        },
        body: "Hi {{1}}, it's been a while since your last visit! We've got exciting new arrivals waiting for you. Come back and enjoy {{2}}% off your next purchase.",
        footer: "This offer expires in 7 days",
        buttons: [
          { id: "btn_006", type: "URL", text: "Shop Now", url: "https://example.com/welcome-back" },
        ],
        createdAt: new Date("2024-11-25T16:00:00"),
        updatedAt: new Date("2024-11-25T16:00:00"),
      },
    ],
  },
  {
    id: "grp_004",
    name: "flash_sale_alert",
    category: "MARKETING",
    createdAt: new Date("2024-11-22T08:00:00"),
    updatedAt: new Date("2024-11-23T10:30:00"),
    translations: [
      {
        id: "trans_004_en",
        language: "en",
        status: "REJECTED",
        body: "FLASH SALE! Everything must go! Up to 90% off for the next 24 hours only! Don't miss out on these incredible deals!",
        buttons: [
          { id: "btn_007", type: "URL", text: "Shop Flash Sale", url: "https://example.com/flash" },
        ],
        rejectionReason: "Template content appears too promotional. Please include more specific product information and ensure compliance with messaging guidelines.",
        createdAt: new Date("2024-11-22T08:00:00"),
        updatedAt: new Date("2024-11-23T10:30:00"),
      },
    ],
  },
  // Utility Templates
  {
    id: "grp_005",
    name: "order_confirmation",
    category: "UTILITY",
    createdAt: new Date("2024-10-01T10:00:00"),
    updatedAt: new Date("2024-11-01T09:00:00"),
    translations: [
      {
        id: "trans_005_en",
        language: "en",
        status: "APPROVED",
        quality: "HIGH",
        header: {
          type: "TEXT",
          text: "Order Confirmed",
        },
        body: "Thank you for your order, {{1}}! Your order #{{2}} has been confirmed. Total: {{3}}. Expected delivery: {{4}}. Track your order using the link below.",
        footer: "Thank you for shopping with us",
        buttons: [
          { id: "btn_009", type: "URL", text: "Track Order", url: "https://example.com/track/{{1}}" },
        ],
        createdAt: new Date("2024-10-01T10:00:00"),
        updatedAt: new Date("2024-10-15T14:00:00"),
      },
      {
        id: "trans_005_zh",
        language: "zh_CN",
        status: "APPROVED",
        quality: "PENDING",
        header: {
          type: "TEXT",
          text: "订单确认",
        },
        body: "您好 {{1}}，您的订单 #{{2}} 已确认。总金额：{{3}}。预计送达时间：{{4}}。",
        buttons: [
          { id: "btn_024", type: "URL", text: "追踪订单", url: "https://example.com/track" },
        ],
        createdAt: new Date("2024-10-20T10:00:00"),
        updatedAt: new Date("2024-11-01T09:00:00"),
      },
      {
        id: "trans_005_id",
        language: "id",
        status: "PENDING",
        header: {
          type: "TEXT",
          text: "Konfirmasi Pesanan",
        },
        body: "Terima kasih atas pesanan Anda, {{1}}! Pesanan #{{2}} telah dikonfirmasi. Total: {{3}}. Perkiraan pengiriman: {{4}}.",
        buttons: [
          { id: "btn_028", type: "URL", text: "Lacak Pesanan", url: "https://example.com/track" },
        ],
        createdAt: new Date("2024-11-25T16:00:00"),
        updatedAt: new Date("2024-11-25T16:00:00"),
      },
    ],
  },
  {
    id: "grp_006",
    name: "shipping_update",
    category: "UTILITY",
    createdAt: new Date("2024-10-05T11:30:00"),
    updatedAt: new Date("2024-10-20T16:45:00"),
    translations: [
      {
        id: "trans_006_en",
        language: "en",
        status: "APPROVED",
        quality: "HIGH",
        body: "Hi {{1}}, your order #{{2}} is on its way! Carrier: {{3}}. Tracking number: {{4}}. Expected delivery: {{5}}.",
        buttons: [
          { id: "btn_010", type: "URL", text: "Track Shipment", url: "https://example.com/track" },
          { id: "btn_011", type: "CALL", text: "Contact Support", phoneNumber: "+1234567890" },
        ],
        createdAt: new Date("2024-10-05T11:30:00"),
        updatedAt: new Date("2024-10-20T16:45:00"),
      },
    ],
  },
  {
    id: "grp_007",
    name: "appointment_reminder",
    category: "UTILITY",
    createdAt: new Date("2024-09-20T09:00:00"),
    updatedAt: new Date("2024-11-10T11:00:00"),
    translations: [
      {
        id: "trans_007_en",
        language: "en",
        status: "APPROVED",
        quality: "HIGH",
        header: {
          type: "TEXT",
          text: "Appointment Reminder",
        },
        body: "Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}} with {{4}}. Please arrive 10 minutes early. Reply YES to confirm or NO to reschedule.",
        buttons: [
          { id: "btn_012", type: "QUICK_REPLY", text: "Confirm" },
          { id: "btn_013", type: "QUICK_REPLY", text: "Reschedule" },
          { id: "btn_014", type: "QUICK_REPLY", text: "Cancel" },
        ],
        createdAt: new Date("2024-09-20T09:00:00"),
        updatedAt: new Date("2024-11-01T10:00:00"),
      },
      {
        id: "trans_007_id",
        language: "id",
        status: "APPROVED",
        quality: "HIGH",
        header: {
          type: "TEXT",
          text: "Pengingat Janji Temu",
        },
        body: "Halo {{1}}, ini pengingat untuk janji temu Anda pada {{2}} pukul {{3}}. Mohon datang 10 menit lebih awal.",
        buttons: [
          { id: "btn_018", type: "QUICK_REPLY", text: "Konfirmasi" },
          { id: "btn_019", type: "QUICK_REPLY", text: "Jadwal Ulang" },
        ],
        createdAt: new Date("2024-11-01T08:00:00"),
        updatedAt: new Date("2024-11-10T11:00:00"),
      },
    ],
  },
  {
    id: "grp_008",
    name: "payment_receipt",
    category: "UTILITY",
    createdAt: new Date("2024-10-10T14:00:00"),
    updatedAt: new Date("2024-10-10T14:00:00"),
    translations: [
      {
        id: "trans_008_en",
        language: "en",
        status: "APPROVED",
        quality: "HIGH",
        header: {
          type: "DOCUMENT",
          mediaUrl: "https://example.com/receipts/sample.pdf",
        },
        body: "Payment received! Amount: {{1}}. Transaction ID: {{2}}. Date: {{3}}. Your receipt is attached above.",
        footer: "Keep this for your records",
        buttons: [],
        createdAt: new Date("2024-10-10T14:00:00"),
        updatedAt: new Date("2024-10-10T14:00:00"),
      },
    ],
  },
  {
    id: "grp_009",
    name: "delivery_completed",
    category: "UTILITY",
    createdAt: new Date("2024-11-28T10:00:00"),
    updatedAt: new Date("2024-11-28T10:00:00"),
    translations: [
      {
        id: "trans_009_en",
        language: "en",
        status: "PENDING",
        body: "Hi {{1}}, great news! Your order #{{2}} has been delivered. We hope you love your purchase! Please rate your experience.",
        buttons: [
          { id: "btn_015", type: "URL", text: "Rate Us", url: "https://example.com/rate" },
          { id: "btn_016", type: "QUICK_REPLY", text: "Report Issue" },
        ],
        createdAt: new Date("2024-11-28T10:00:00"),
        updatedAt: new Date("2024-11-28T10:00:00"),
      },
    ],
  },
  {
    id: "grp_010",
    name: "subscription_renewal",
    category: "UTILITY",
    createdAt: new Date("2024-08-15T12:00:00"),
    updatedAt: new Date("2024-11-05T09:30:00"),
    translations: [
      {
        id: "trans_010_en",
        language: "en",
        status: "APPROVED",
        quality: "MEDIUM",
        body: "Hi {{1}}, your subscription will renew on {{2}}. Amount: {{3}}. To manage your subscription or update payment method, click below.",
        buttons: [
          { id: "btn_017", type: "URL", text: "Manage Subscription", url: "https://example.com/account" },
        ],
        createdAt: new Date("2024-08-15T12:00:00"),
        updatedAt: new Date("2024-11-05T09:30:00"),
      },
    ],
  },
  {
    id: "grp_011",
    name: "booking_confirmation",
    category: "UTILITY",
    createdAt: new Date("2024-11-20T09:00:00"),
    updatedAt: new Date("2024-11-21T10:00:00"),
    translations: [
      {
        id: "trans_011_th",
        language: "th",
        status: "REJECTED",
        body: "สวัสดี {{1}} การจองของคุณได้รับการยืนยันแล้ว วันที่: {{2}} เวลา: {{3}}",
        buttons: [
          { id: "btn_026", type: "QUICK_REPLY", text: "ยืนยัน" },
          { id: "btn_027", type: "QUICK_REPLY", text: "ยกเลิก" },
        ],
        rejectionReason: "Sample content does not match the actual template parameters. Please provide valid sample values.",
        createdAt: new Date("2024-11-20T09:00:00"),
        updatedAt: new Date("2024-11-21T10:00:00"),
      },
    ],
  },
  // Authentication Templates
  {
    id: "grp_012",
    name: "otp_verification",
    category: "AUTHENTICATION",
    createdAt: new Date("2024-07-01T10:00:00"),
    updatedAt: new Date("2024-09-15T14:00:00"),
    translations: [
      {
        id: "trans_012_en",
        language: "en",
        status: "APPROVED",
        quality: "HIGH",
        body: "Your verification code is {{1}}. This code expires in 10 minutes. Do not share this code with anyone.",
        footer: "Code expires in 10 minutes",
        buttons: [
          { id: "btn_020", type: "COPY_CODE", text: "Copy Code" },
        ],
        createdAt: new Date("2024-07-01T10:00:00"),
        updatedAt: new Date("2024-09-15T14:00:00"),
      },
    ],
  },
  {
    id: "grp_013",
    name: "login_verification",
    category: "AUTHENTICATION",
    createdAt: new Date("2024-08-01T09:00:00"),
    updatedAt: new Date("2024-10-01T11:30:00"),
    translations: [
      {
        id: "trans_013_en",
        language: "en",
        status: "APPROVED",
        quality: "HIGH",
        body: "A login attempt was made to your account. Your security code is {{1}}. If this wasn't you, please secure your account immediately.",
        buttons: [
          { id: "btn_021", type: "COPY_CODE", text: "Copy Code" },
          { id: "btn_022", type: "URL", text: "Secure Account", url: "https://example.com/security" },
        ],
        createdAt: new Date("2024-08-01T09:00:00"),
        updatedAt: new Date("2024-10-01T11:30:00"),
      },
    ],
  },
  {
    id: "grp_014",
    name: "password_reset_otp",
    category: "AUTHENTICATION",
    createdAt: new Date("2024-11-26T15:00:00"),
    updatedAt: new Date("2024-11-26T15:00:00"),
    translations: [
      {
        id: "trans_014_en",
        language: "en",
        status: "PENDING",
        body: "You requested a password reset. Your code is {{1}}. Valid for 15 minutes. If you didn't request this, ignore this message.",
        footer: "Valid for 15 minutes",
        buttons: [
          { id: "btn_023", type: "COPY_CODE", text: "Copy Code" },
        ],
        createdAt: new Date("2024-11-26T15:00:00"),
        updatedAt: new Date("2024-11-26T15:00:00"),
      },
    ],
  },
]

// Migration utility: Convert flat templates to grouped structure
export function migrateToGroupedTemplates(
  flatTemplates: WhatsAppTemplate[]
): WhatsAppTemplateGroup[] {
  const groups = new Map<string, WhatsAppTemplateGroup>()

  for (const template of flatTemplates) {
    const existing = groups.get(template.name)

    const translation: TemplateTranslation = {
      id: template.id,
      language: template.language,
      status: template.status,
      quality: template.quality,
      header: template.header,
      body: template.body,
      footer: template.footer,
      buttons: template.buttons,
      rejectionReason: template.rejectionReason,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }

    if (existing) {
      existing.translations.push(translation)
      if (template.updatedAt > existing.updatedAt) {
        existing.updatedAt = template.updatedAt
      }
    } else {
      groups.set(template.name, {
        id: `group_${template.name}`,
        name: template.name,
        category: template.category,
        translations: [translation],
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })
    }
  }

  return Array.from(groups.values())
}

// Legacy: Flat template structure (kept for backward compatibility)
export const mockTemplates: WhatsAppTemplate[] = [
  // Marketing Templates
  {
    id: "tpl_001",
    name: "holiday_sale_announcement",
    category: "MARKETING",
    status: "APPROVED",
    quality: "HIGH",
    language: "en",
    header: {
      type: "IMAGE",
      mediaUrl: "https://example.com/holiday-sale.jpg",
    },
    body: "Hi {{1}}! Our Holiday Sale is here! Get up to {{2}}% off on all items. Shop now and save big! Use code: {{3}} at checkout. Valid until {{4}}.",
    footer: "Reply STOP to unsubscribe",
    buttons: [
      { id: "btn_001", type: "URL", text: "Shop Now", url: "https://example.com/sale" },
      { id: "btn_002", type: "QUICK_REPLY", text: "View Catalog" },
    ],
    createdAt: new Date("2024-11-15T10:00:00"),
    updatedAt: new Date("2024-11-20T14:30:00"),
  },
  {
    id: "tpl_002",
    name: "new_product_launch",
    category: "MARKETING",
    status: "APPROVED",
    quality: "MEDIUM",
    language: "en",
    header: {
      type: "VIDEO",
      mediaUrl: "https://example.com/product-launch.mp4",
    },
    body: "Introducing our latest innovation! {{1}} is now available. Be among the first to experience {{2}}. Limited quantities available!",
    footer: "Exclusive for our valued customers",
    buttons: [
      { id: "btn_003", type: "URL", text: "Pre-order Now", url: "https://example.com/preorder" },
      { id: "btn_004", type: "QUICK_REPLY", text: "Learn More" },
      { id: "btn_005", type: "QUICK_REPLY", text: "Not Interested" },
    ],
    createdAt: new Date("2024-11-10T09:00:00"),
    updatedAt: new Date("2024-11-18T11:45:00"),
  },
  {
    id: "tpl_003",
    name: "customer_reengagement",
    category: "MARKETING",
    status: "PENDING",
    language: "en",
    header: {
      type: "TEXT",
      text: "We Miss You!",
    },
    body: "Hi {{1}}, it's been a while since your last visit! We've got exciting new arrivals waiting for you. Come back and enjoy {{2}}% off your next purchase.",
    footer: "This offer expires in 7 days",
    buttons: [
      { id: "btn_006", type: "URL", text: "Shop Now", url: "https://example.com/welcome-back" },
    ],
    createdAt: new Date("2024-11-25T16:00:00"),
    updatedAt: new Date("2024-11-25T16:00:00"),
  },
  {
    id: "tpl_004",
    name: "flash_sale_alert",
    category: "MARKETING",
    status: "REJECTED",
    language: "en",
    body: "FLASH SALE! Everything must go! Up to 90% off for the next 24 hours only! Don't miss out on these incredible deals!",
    buttons: [
      { id: "btn_007", type: "URL", text: "Shop Flash Sale", url: "https://example.com/flash" },
    ],
    createdAt: new Date("2024-11-22T08:00:00"),
    updatedAt: new Date("2024-11-23T10:30:00"),
    rejectionReason: "Template content appears too promotional. Please include more specific product information and ensure compliance with messaging guidelines.",
  },
  {
    id: "tpl_005",
    name: "promocion_especial",
    category: "MARKETING",
    status: "APPROVED",
    quality: "HIGH",
    language: "es",
    header: {
      type: "IMAGE",
      mediaUrl: "https://example.com/promo-es.jpg",
    },
    body: "Hola {{1}}! Tenemos una oferta especial para ti. Obtén {{2}}% de descuento en tu próxima compra. Usa el código: {{3}}",
    footer: "Responde PARAR para cancelar",
    buttons: [
      { id: "btn_008", type: "URL", text: "Comprar Ahora", url: "https://example.com/es/shop" },
    ],
    createdAt: new Date("2024-11-12T12:00:00"),
    updatedAt: new Date("2024-11-14T09:15:00"),
  },
  // Utility Templates
  {
    id: "tpl_006",
    name: "order_confirmation",
    category: "UTILITY",
    status: "APPROVED",
    quality: "HIGH",
    language: "en",
    header: {
      type: "TEXT",
      text: "Order Confirmed",
    },
    body: "Thank you for your order, {{1}}! Your order #{{2}} has been confirmed. Total: {{3}}. Expected delivery: {{4}}. Track your order using the link below.",
    footer: "Thank you for shopping with us",
    buttons: [
      { id: "btn_009", type: "URL", text: "Track Order", url: "https://example.com/track/{{1}}" },
    ],
    createdAt: new Date("2024-10-01T10:00:00"),
    updatedAt: new Date("2024-10-15T14:00:00"),
  },
  {
    id: "tpl_007",
    name: "shipping_update",
    category: "UTILITY",
    status: "APPROVED",
    quality: "HIGH",
    language: "en",
    body: "Hi {{1}}, your order #{{2}} is on its way! Carrier: {{3}}. Tracking number: {{4}}. Expected delivery: {{5}}.",
    buttons: [
      { id: "btn_010", type: "URL", text: "Track Shipment", url: "https://example.com/track" },
      { id: "btn_011", type: "CALL", text: "Contact Support", phoneNumber: "+1234567890" },
    ],
    createdAt: new Date("2024-10-05T11:30:00"),
    updatedAt: new Date("2024-10-20T16:45:00"),
  },
  {
    id: "tpl_008",
    name: "appointment_reminder",
    category: "UTILITY",
    status: "APPROVED",
    quality: "HIGH",
    language: "en",
    header: {
      type: "TEXT",
      text: "Appointment Reminder",
    },
    body: "Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}} with {{4}}. Please arrive 10 minutes early. Reply YES to confirm or NO to reschedule.",
    buttons: [
      { id: "btn_012", type: "QUICK_REPLY", text: "Confirm" },
      { id: "btn_013", type: "QUICK_REPLY", text: "Reschedule" },
      { id: "btn_014", type: "QUICK_REPLY", text: "Cancel" },
    ],
    createdAt: new Date("2024-09-20T09:00:00"),
    updatedAt: new Date("2024-11-01T10:00:00"),
  },
  {
    id: "tpl_009",
    name: "payment_receipt",
    category: "UTILITY",
    status: "APPROVED",
    quality: "HIGH",
    language: "en",
    header: {
      type: "DOCUMENT",
      mediaUrl: "https://example.com/receipts/sample.pdf",
    },
    body: "Payment received! Amount: {{1}}. Transaction ID: {{2}}. Date: {{3}}. Your receipt is attached above.",
    footer: "Keep this for your records",
    buttons: [],
    createdAt: new Date("2024-10-10T14:00:00"),
    updatedAt: new Date("2024-10-10T14:00:00"),
  },
  {
    id: "tpl_010",
    name: "delivery_completed",
    category: "UTILITY",
    status: "PENDING",
    language: "en",
    body: "Hi {{1}}, great news! Your order #{{2}} has been delivered. We hope you love your purchase! Please rate your experience.",
    buttons: [
      { id: "btn_015", type: "URL", text: "Rate Us", url: "https://example.com/rate" },
      { id: "btn_016", type: "QUICK_REPLY", text: "Report Issue" },
    ],
    createdAt: new Date("2024-11-28T10:00:00"),
    updatedAt: new Date("2024-11-28T10:00:00"),
  },
  {
    id: "tpl_011",
    name: "subscription_renewal",
    category: "UTILITY",
    status: "APPROVED",
    quality: "MEDIUM",
    language: "en",
    body: "Hi {{1}}, your subscription will renew on {{2}}. Amount: {{3}}. To manage your subscription or update payment method, click below.",
    buttons: [
      { id: "btn_017", type: "URL", text: "Manage Subscription", url: "https://example.com/account" },
    ],
    createdAt: new Date("2024-08-15T12:00:00"),
    updatedAt: new Date("2024-11-05T09:30:00"),
  },
  {
    id: "tpl_012",
    name: "pengingat_janji",
    category: "UTILITY",
    status: "APPROVED",
    quality: "HIGH",
    language: "id",
    header: {
      type: "TEXT",
      text: "Pengingat Janji Temu",
    },
    body: "Halo {{1}}, ini pengingat untuk janji temu Anda pada {{2}} pukul {{3}}. Mohon datang 10 menit lebih awal.",
    buttons: [
      { id: "btn_018", type: "QUICK_REPLY", text: "Konfirmasi" },
      { id: "btn_019", type: "QUICK_REPLY", text: "Jadwal Ulang" },
    ],
    createdAt: new Date("2024-11-01T08:00:00"),
    updatedAt: new Date("2024-11-10T11:00:00"),
  },
  // Authentication Templates
  {
    id: "tpl_013",
    name: "otp_verification",
    category: "AUTHENTICATION",
    status: "APPROVED",
    quality: "HIGH",
    language: "en",
    body: "Your verification code is {{1}}. This code expires in 10 minutes. Do not share this code with anyone.",
    footer: "Code expires in 10 minutes",
    buttons: [
      { id: "btn_020", type: "COPY_CODE", text: "Copy Code" },
    ],
    createdAt: new Date("2024-07-01T10:00:00"),
    updatedAt: new Date("2024-09-15T14:00:00"),
  },
  {
    id: "tpl_014",
    name: "login_verification",
    category: "AUTHENTICATION",
    status: "APPROVED",
    quality: "HIGH",
    language: "en",
    body: "A login attempt was made to your account. Your security code is {{1}}. If this wasn't you, please secure your account immediately.",
    buttons: [
      { id: "btn_021", type: "COPY_CODE", text: "Copy Code" },
      { id: "btn_022", type: "URL", text: "Secure Account", url: "https://example.com/security" },
    ],
    createdAt: new Date("2024-08-01T09:00:00"),
    updatedAt: new Date("2024-10-01T11:30:00"),
  },
  {
    id: "tpl_015",
    name: "password_reset_otp",
    category: "AUTHENTICATION",
    status: "PENDING",
    language: "en",
    body: "You requested a password reset. Your code is {{1}}. Valid for 15 minutes. If you didn't request this, ignore this message.",
    footer: "Valid for 15 minutes",
    buttons: [
      { id: "btn_023", type: "COPY_CODE", text: "Copy Code" },
    ],
    createdAt: new Date("2024-11-26T15:00:00"),
    updatedAt: new Date("2024-11-26T15:00:00"),
  },
  // Chinese templates
  {
    id: "tpl_016",
    name: "order_confirmation_zh",
    category: "UTILITY",
    status: "APPROVED",
    quality: "PENDING",
    language: "zh_CN",
    header: {
      type: "TEXT",
      text: "订单确认",
    },
    body: "您好 {{1}}，您的订单 #{{2}} 已确认。总金额：{{3}}。预计送达时间：{{4}}。",
    buttons: [
      { id: "btn_024", type: "URL", text: "追踪订单", url: "https://example.com/track" },
    ],
    createdAt: new Date("2024-10-20T10:00:00"),
    updatedAt: new Date("2024-11-01T09:00:00"),
  },
  {
    id: "tpl_017",
    name: "promotion_zh_hk",
    category: "MARKETING",
    status: "APPROVED",
    quality: "LOW",
    language: "zh_HK",
    header: {
      type: "IMAGE",
      mediaUrl: "https://example.com/promo-hk.jpg",
    },
    body: "您好 {{1}}！限時優惠！全場{{2}}折起，優惠碼：{{3}}，有效期至{{4}}。",
    footer: "回覆STOP取消訂閱",
    buttons: [
      { id: "btn_025", type: "URL", text: "立即選購", url: "https://example.com/hk/shop" },
    ],
    createdAt: new Date("2024-11-05T11:00:00"),
    updatedAt: new Date("2024-11-15T14:30:00"),
  },
  {
    id: "tpl_018",
    name: "booking_confirmation_th",
    category: "UTILITY",
    status: "REJECTED",
    language: "th",
    body: "สวัสดี {{1}} การจองของคุณได้รับการยืนยันแล้ว วันที่: {{2}} เวลา: {{3}}",
    buttons: [
      { id: "btn_026", type: "QUICK_REPLY", text: "ยืนยัน" },
      { id: "btn_027", type: "QUICK_REPLY", text: "ยกเลิก" },
    ],
    createdAt: new Date("2024-11-20T09:00:00"),
    updatedAt: new Date("2024-11-21T10:00:00"),
    rejectionReason: "Sample content does not match the actual template parameters. Please provide valid sample values.",
  },
]
