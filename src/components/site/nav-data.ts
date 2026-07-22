export const shopMenu: {
  title: string;
  items: { label: string; href: string }[];
}[] = [
  {
    title: "Apparel",
    items: [
      { label: "Round Neck T-Shirts", href: "/shop?category=apparel" },
      { label: "Polo Shirts", href: "/shop?category=apparel" },
      { label: "Hoodies", href: "/shop?category=apparel" },
      { label: "Caps", href: "/shop?category=apparel" },
      { label: "Safety Wear", href: "/shop?category=apparel" },
      { label: "Uniforms", href: "/shop?category=apparel" },
    ],
  },
  {
    title: "Printing",
    items: [
      { label: "Business Cards", href: "/shop?category=printing" },
      { label: "Flyers", href: "/shop?category=printing" },
      { label: "Brochures", href: "/shop?category=printing" },
      { label: "Posters", href: "/shop?category=printing" },
      { label: "Receipt Books", href: "/shop?category=printing" },
      { label: "Calendars", href: "/shop?category=printing" },
    ],
  },
  {
    title: "Signage",
    items: [
      { label: "Roll Up Banners", href: "/shop?category=signage" },
      { label: "PVC Boards", href: "/shop?category=signage" },
      { label: "Acrylic Signs", href: "/shop?category=signage" },
      { label: "Vehicle Branding", href: "/shop?category=signage" },
      { label: "Shop Signs", href: "/shop?category=signage" },
    ],
  },
  {
    title: "Promotional Items",
    items: [
      { label: "Pens", href: "/shop?category=promotional-items" },
      { label: "Mugs", href: "/shop?category=promotional-items" },
      { label: "Water Bottles", href: "/shop?category=promotional-items" },
      { label: "Lanyards", href: "/shop?category=promotional-items" },
      { label: "Key Holders", href: "/shop?category=promotional-items" },
      { label: "Gift Sets", href: "/shop?category=promotional-items" },
    ],
  },
  {
    title: "Packaging",
    items: [
      { label: "Boxes", href: "/shop?category=packaging" },
      { label: "Shopping Bags", href: "/shop?category=packaging" },
      { label: "Paper Bags", href: "/shop?category=packaging" },
      { label: "Labels", href: "/shop?category=packaging" },
      { label: "Stickers", href: "/shop?category=packaging" },
    ],
  },
];

/** Category slugs, in nav order. Must match the `slug` column in the `categories` table. */
export const shopCategorySlugs = [
  "apparel",
  "printing",
  "signage",
  "promotional-items",
  "packaging",
  "corporate-gifts",
] as const;

export type ShopCategorySlug = (typeof shopCategorySlugs)[number];

export const services = [
  "Graphic Design",
  "Logo Design",
  "Brand Identity",
  "Corporate Branding",
  "Digital Printing",
  "Screen Printing",
  "Embroidery",
  "Laser Engraving",
  "Vehicle Branding",
  "Office Branding",
  "Packaging Design",
  "Signage Installation",
];

export const industries = [
  "Corporate",
  "Schools",
  "Hospitals",
  "Churches",
  "NGOs",
  "Government",
  "Hotels",
  "Restaurants",
  "Construction",
  "Manufacturing",
  "Events",
  "Sports Clubs",
];