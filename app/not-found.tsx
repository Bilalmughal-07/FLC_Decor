import Link from "next/link";
export default function NotFound() { return <div className="narrow-page"><p className="eyebrow">404 / Not found</p><h1>That piece isn’t in the collection.</h1><p className="lead">Try the full shop or return home.</p><Link className="button button-dark" href="/shop">Browse the collection</Link></div>; }
