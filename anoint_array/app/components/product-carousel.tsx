"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingCart, Star } from "lucide-react";
import { usePayment } from "@/contexts/payment-context";

type Product = {
  id: string;
  name: string;
  slug: string;
  teaserDescription?: string;
  price: number;
  category: string;
  imageUrl?: string;
  imageGallery?: string[];
  featured?: boolean;
  inStock?: boolean;
  isPhysical?: boolean;
  isDigital?: boolean;
};

export default function ProductCarousel() {
  const { addToCart } = usePayment();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("ALL");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/products?featured=true", { cache: "no-store" });
        const j = await r.json();
        const arr: Product[] = Array.isArray(j) ? j : j?.products || [];
        const normalized = arr.map((p) => ({
          ...p,
          imageUrl: p.imageUrl || (p.imageGallery && p.imageGallery[0]) || p.imageUrl,
        }));
        setProducts(normalized.filter((p) => !/VIP|Bio-Scalar/i.test(p?.name || "")));
      } catch (e) {
        console.error("Failed to load featured products", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return ["ALL", ...cats];
  }, [products]);

  const shown = useMemo(() => {
    if (category === "ALL") return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  const scrollBy = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.9) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (loading) {
    return <div className="h-72 flex items-center justify-center text-gray-400">Loading featured products…</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              category === c ? "aurora-gradient text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {c === "ALL" ? "All Products" : c}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-gray-900/70 hover:bg-gray-900 rounded-full p-2 border border-gray-700 hidden md:block"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-gray-900/70 hover:bg-gray-900 rounded-full p-2 border border-gray-700 hidden md:block"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        <div ref={scrollerRef} className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 px-1">
            {shown.map((p) => (
              <div key={p.id} className="min-w-[260px] max-w-[260px] mystical-card rounded-lg p-4">
                <Link href={`/products/${p.slug || p.id}`} className="block">
                  <div className="relative aspect-[4/3] mb-3 rounded-lg overflow-hidden bg-gray-800">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-gray-500">No image</div>
                    )}
                    {p.featured && (
                      <span className="absolute top-2 right-2 bg-purple-600/80 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    )}
                  </div>
                </Link>
                <Link href={`/products/${p.slug || p.id}`} className="block">
                  <div className="font-semibold text-white line-clamp-2 mb-1 hover:text-purple-300">{p.name}</div>
                </Link>
                <div className="text-xs text-gray-400 mb-3 line-clamp-2">{p.teaserDescription || ""}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold aurora-text">${p.price.toFixed(2)}</div>
                  <button
                    onClick={() => {
                      if (p.inStock) {
                        addToCart({
                          id: p.id,
                          name: p.name,
                          price: p.price,
                          quantity: 1,
                          type: "product",
                          imageUrl: p.imageUrl,
                          category: p.category,
                          customData: { isPhysical: !!p.isPhysical, isDigital: !!p.isDigital },
                        });
                      }
                    }}
                    disabled={!p.inStock}
                    className={`px-3 py-2 rounded text-sm flex items-center gap-1 ${
                      p.inStock ? "aurora-gradient text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4" /> {p.inStock ? "Add" : "Out"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
