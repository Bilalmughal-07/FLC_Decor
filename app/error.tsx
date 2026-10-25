"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <div className="narrow-page"><p className="eyebrow">Something went wrong</p><h1>The collection needs a moment.</h1><p className="lead">No order was confirmed by this screen. Retry the page or return to the storefront.</p><button className="button button-dark" onClick={() => reset()}>Try again</button></div>; }
