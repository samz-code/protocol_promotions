import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, MessageSquareQuote, Star } from "lucide-react";
import { fetchApprovedReviews } from "@/lib/publicReviews";
import { supabase } from "@/lib/supabase";

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Protocol+Promotions+Ltd./@-1.2803404,36.8252491,1189m/data=!3m2!1e3!4b1!4m6!3m5!1s0x182f11a67bb07663:0x5b54221b99d2823f!8m2!3d-1.2803404!4d36.8252491?hl=en";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.09 3.67-5.17 3.67-8.46z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.01C3.26 21.3 7.37 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.7H1.29C.47 8.32 0 10.11 0 12s.47 3.68 1.29 5.3l3.98-3.01z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.7l3.98 3.01c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

export function ClientReviews() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const { data: reviews = [], isLoading, isError } = useQuery({
    queryKey: ["public-reviews"],
    queryFn: fetchApprovedReviews,
    staleTime: 5 * 60 * 1000,
  });
  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        author_name: authorName.trim(),
        author_role: authorRole.trim() || null,
        body: body.trim(),
        rating,
        status: "pending",
        is_verified: false,
        source: "website",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setAuthorName("");
      setAuthorRole("");
      setBody("");
      setRating(5);
      await queryClient.invalidateQueries({ queryKey: ["public-reviews"] });
    },
  });
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;
  const loop = reviews.length > 1 ? [...reviews, ...reviews] : reviews;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authorName.trim() || !body.trim()) return;
    submitReview.mutate();
  };

  return (
    <section className="overflow-hidden border-b border-brand-navy bg-brand-surface">
      <style>{`
        @keyframes reviewMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .review-track { animation: reviewMarquee 60s linear infinite; }
        .review-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .review-track { animation: none; }
        }
      `}</style>

      <div className="container-page pt-12 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-brand-navy pb-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center border border-brand-navy/15 bg-white p-2 shadow-sm">
              <MessageSquareQuote className="h-full w-full text-brand-navy" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl md:text-4xl">
                What our clients say
              </h2>
              {average !== null && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="flex gap-0.5 text-brand-orange" aria-label={`${average.toFixed(1)} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star key={index} className={`h-4 w-4 ${index < Math.round(average) ? "fill-current" : "fill-none"}`} />
                    ))}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-brand-navy">{average.toFixed(1)}</span>
                  <span className="text-sm text-brand-navy/55">
                    from {reviews.length} published review{reviews.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setFormOpen((open) => !open);
                submitReview.reset();
              }}
              aria-expanded={formOpen}
              className="inline-flex min-h-10 items-center justify-center border border-brand-navy px-4 py-2 text-sm font-bold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white"
            >
              {formOpen ? "Close form" : "Write a review"}
            </button>
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-navy transition-colors hover:text-brand-orange"
            >
              Read our Google reviews <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="container-page pt-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 border border-brand-navy/15 bg-white p-5 sm:p-6">
            <div>
              <h3 className="text-lg font-extrabold text-brand-navy">Share your experience</h3>
              <p className="mt-1 text-sm text-brand-navy/60">Your review will appear after it has been approved.</p>
            </div>

            {submitReview.isSuccess && (
              <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Thank you. Your review has been submitted for approval.
              </p>
            )}
            {submitReview.isError && (
              <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {submitReview.error instanceof Error ? submitReview.error.message : "Could not submit your review. Please try again."}
              </p>
            )}

            <label className="block space-y-1.5 text-sm font-semibold text-brand-navy">
              <span>Your name</span>
              <input
                required
                maxLength={100}
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                className="w-full rounded-md border border-brand-navy/20 px-3 py-2.5 font-normal outline-none focus:border-brand-navy"
              />
            </label>

            <label className="block space-y-1.5 text-sm font-semibold text-brand-navy">
              <span>Company or role (optional)</span>
              <input
                maxLength={120}
                value={authorRole}
                onChange={(event) => setAuthorRole(event.target.value)}
                className="w-full rounded-md border border-brand-navy/20 px-3 py-2.5 font-normal outline-none focus:border-brand-navy"
              />
            </label>

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-brand-navy">Your rating</legend>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      aria-pressed={rating === value}
                      className="rounded p-1 focus-visible:outline-2 focus-visible:outline-brand-navy"
                    >
                      <Star className={`h-6 w-6 ${value <= rating ? "fill-brand-orange text-brand-orange" : "text-brand-navy/25"}`} />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="block space-y-1.5 text-sm font-semibold text-brand-navy">
              <span>Your review</span>
              <textarea
                required
                maxLength={3000}
                rows={4}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="w-full resize-y rounded-md border border-brand-navy/20 px-3 py-2.5 font-normal outline-none focus:border-brand-navy"
              />
            </label>

            <button
              type="submit"
              disabled={submitReview.isPending}
              className="inline-flex min-h-10 items-center justify-center bg-brand-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitReview.isPending ? "Submitting..." : "Submit review"}
            </button>
          </form>
        </div>
      )}

      <div className="py-8 md:py-12">
        {isLoading ? (
          <p className="container-page text-sm text-brand-navy/60">Loading client reviews...</p>
        ) : isError ? (
          <p className="container-page text-sm text-red-700">Client reviews are unavailable right now.</p>
        ) : reviews.length === 0 ? (
          <p className="container-page text-sm text-brand-navy/60">No published client reviews yet.</p>
        ) : (
          <div className="overflow-hidden">
            <div className={`${loop.length > 1 ? "review-track" : "mx-auto"} flex w-max gap-4 px-5 sm:gap-5 sm:px-6`}>
              {loop.map((review, index) => (
                <figure
                  key={`${review.id}-${index}`}
                  aria-hidden={index >= reviews.length}
                  className="relative w-72 shrink-0 border border-brand-navy/15 bg-white p-5 sm:w-80 sm:p-6"
                >
                  <div className="absolute right-5 top-5 h-4 w-4 opacity-60" title="Google review">
                    <GoogleIcon />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-navy text-sm font-bold uppercase text-white">
                      {review.author_name.trim().charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <figcaption className="truncate text-sm font-bold text-brand-navy">{review.author_name}</figcaption>
                      <div className="text-[11px] text-brand-navy/50">
                        {review.author_role || (review.is_verified ? "Verified customer" : "Client")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-0.5 text-brand-orange" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star key={star} className={`h-3.5 w-3.5 ${star < review.rating ? "fill-current" : "fill-none text-brand-navy/25"}`} />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-sm leading-relaxed text-brand-navy/75">
                    {review.body}
                  </blockquote>
                </figure>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
