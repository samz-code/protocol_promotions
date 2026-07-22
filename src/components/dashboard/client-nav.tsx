import {
  LayoutDashboard, ShoppingBag, FileText, Truck, Image as ImageIcon, Upload,
  Receipt, CreditCard, MapPin, Bell, LifeBuoy, User, Repeat,
} from "lucide-react";

export const clientNav = [
  { label: "Overview", to: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Orders", to: "/dashboard/orders", icon: <ShoppingBag className="h-4 w-4" /> },
  { label: "Quotes", to: "/dashboard/quotes", icon: <FileText className="h-4 w-4" /> },
  { label: "Track Production", to: "/dashboard/track-production", icon: <Truck className="h-4 w-4" /> },
  { label: "Saved Artwork", to: "/dashboard/artwork", icon: <ImageIcon className="h-4 w-4" /> },
  { label: "Upload Artwork", to: "/dashboard/artwork/upload", icon: <Upload className="h-4 w-4" /> },
  { label: "Invoices", to: "/dashboard/invoices", icon: <Receipt className="h-4 w-4" /> },
  { label: "Payments", to: "/dashboard/payments", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Addresses", to: "/dashboard/addresses", icon: <MapPin className="h-4 w-4" /> },
  { label: "Notifications", to: "/dashboard/notifications", icon: <Bell className="h-4 w-4" /> },
  { label: "Support Tickets", to: "/dashboard/support", icon: <LifeBuoy className="h-4 w-4" /> },
  { label: "Reorder", to: "/dashboard/reorder", icon: <Repeat className="h-4 w-4" /> },
  { label: "Profile", to: "/dashboard/profile", icon: <User className="h-4 w-4" /> },
];