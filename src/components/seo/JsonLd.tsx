/**
 * A `<script type="application/ld+json">` block.
 *
 * Rendered by a server component, so the graph is in the initial HTML: both
 * Google's parser and the crawlers behind generative answers read the document
 * as delivered, and anything a client effect adds later is invisible to them.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type="application/ld+json"
            // The payload is our own translated strings, not user input. `<` is
            // still escaped: a `</script>` inside a description would otherwise
            // close the block early and spill the rest into the page.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
    );
}
