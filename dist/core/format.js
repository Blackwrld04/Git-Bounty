/**
 * Utility functions for converting Gibwork HTML content to clean Markdown and terminal text.
 */
export function htmlToMarkdown(html) {
    if (!html)
        return '';
    let md = html
        // Headers
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
        // Bold & italic
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        // Lists
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
        // Links
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        // Blockquotes
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '\n> $1\n')
        // Paragraphs & breaks
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        // Images
        .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '[Image: $1]')
        .replace(/<img[^>]*>/gi, '')
        // Remove all remaining tags
        .replace(/<[^>]+>/g, '')
        // HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        // Normalize excessive newlines
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
    return md;
}
export function formatDate(dateString) {
    if (!dateString)
        return 'No deadline specified';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime()))
            return dateString;
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
        });
    }
    catch {
        return dateString;
    }
}
//# sourceMappingURL=format.js.map