// Citation formatting utilities

// Citation styles
export const CITATION_STYLES = {
    INLINE: 'inline',
    FOOTNOTE: 'footnote',
    ENDNOTE: 'endnote',
    APA: 'apa',
    MLA: 'mla',
    CHICAGO: 'chicago'
};

// Format citation
export const formatCitation = (citation, style = CITATION_STYLES.INLINE) => {
    switch (style) {
        case CITATION_STYLES.INLINE:
            return formatInlineCitation(citation);
        case CITATION_STYLES.FOOTNOTE:
            return formatFootnoteCitation(citation);
        case CITATION_STYLES.ENDNOTE:
            return formatEndnoteCitation(citation);
        case CITATION_STYLES.APA:
            return formatAPACitation(citation);
        case CITATION_STYLES.MLA:
            return formatMLACitation(citation);
        case CITATION_STYLES.CHICAGO:
            return formatChicagoCitation(citation);
        default:
            return formatInlineCitation(citation);
    }
};

// Format inline citation
export const formatInlineCitation = (citation) => {
    const { number, title } = citation;
    return `[${number}]`;
};

// Format footnote citation
export const formatFootnoteCitation = (citation) => {
    const { number, title, metadata = {} } = citation;
    const author = metadata.author || 'Unknown';
    const department = metadata.department || '';
    return `${number}. ${author}, "${title}"${department ? `, ${department}` : ''}`;
};

// Format endnote citation
export const formatEndnoteCitation = (citation) => {
    const { number, title, metadata = {} } = citation;
    const author = metadata.author || 'Unknown';
    const date = metadata.created_at || '';
    return `${number}. ${author}. ${title}. ${date}`;
};

// Format APA citation
export const formatAPACitation = (citation) => {
    const { title, metadata = {} } = citation;
    const author = metadata.author || 'Unknown';
    const year = metadata.year || new Date().getFullYear();
    return `(${author}, ${year})`;
};

// Format APA reference
export const formatAPAReference = (citation) => {
    const { title, metadata = {} } = citation;
    const author = metadata.author || 'Unknown';
    const year = metadata.year || new Date().getFullYear();
    return `${author} (${year}). ${title}.`;
};

// Format MLA citation
export const formatMLACitation = (citation) => {
    const { title, metadata = {} } = citation;
    const author = metadata.author || 'Unknown';
    return `(${author})`;
};

// Format MLA reference
export const formatMLAReference = (citation) => {
    const { title, metadata = {} } = citation;
    const author = metadata.author || 'Unknown';
    return `${author}. "${title}."`;
};

// Format Chicago citation
export const formatChicagoCitation = (citation) => {
    const { number, title, metadata = {} } = citation;
    const author = metadata.author || 'Unknown';
    return `${author}, "${title}," ${number}.`;
};

// Generate citations from sources
export const generateCitations = (sources, style = CITATION_STYLES.INLINE) => {
    return sources.map((source, index) => ({
        id: `cite-${index + 1}`,
        number: index + 1,
        document_id: source.id,
        title: source.title,
        relevance_score: source.relevanceScore,
        metadata: source.metadata || {},
        style,
        text: formatCitation({
            number: index + 1,
            title: source.title,
            metadata: source.metadata
        }, style)
    }));
};

// Extract citations from response text
export const extractCitationsFromText = (text, citations) => {
    const extractedCitations = [];

    if (!text || !citations) return extractedCitations;

    citations.forEach(citation => {
        const pattern = new RegExp(`\\[${citation.number}\\]`, 'g');
        if (pattern.test(text)) {
            extractedCitations.push(citation);
        }
    });

    return extractedCitations;
};

// Generate citation reference list
export const generateReferenceList = (citations, style = CITATION_STYLES.APA) => {
    return citations.map(citation => {
        switch (style) {
            case CITATION_STYLES.APA:
                return formatAPAReference(citation);
            case CITATION_STYLES.MLA:
                return formatMLAReference(citation);
            case CITATION_STYLES.CHICAGO:
                return formatChicagoCitation(citation);
            default:
                return formatEndnoteCitation(citation);
        }
    });
};

// Sort citations by relevance
export const sortCitationsByRelevance = (citations) => {
    return [...citations].sort((a, b) =>
        (b.relevance_score || 0) - (a.relevance_score || 0)
    );
};

// Deduplicate citations
export const deduplicateCitations = (citations) => {
    const seen = new Set();
    return citations.filter(citation => {
        const key = citation.document_id || citation.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

// Format citation for display
export const formatCitationForDisplay = (citation) => {
    return {
        ...citation,
        formattedText: citation.text || `[${citation.number}]`,
        formattedTitle: citation.title || `Document ${citation.number}`,
        formattedRelevance: citation.relevance_score
            ? `${(citation.relevance_score * 100).toFixed(1)}%`
            : 'N/A'
    };
};

// Generate citation HTML
export const generateCitationHTML = (citation) => {
    return `<a href="#citation-${citation.number}" class="citation-link">[${citation.number}]</a>`;
};

// Generate citation markdown
export const generateCitationMarkdown = (citation) => {
    return `[${citation.number}]: ${citation.title}`;
};

export default {
    CITATION_STYLES,
    formatCitation,
    formatInlineCitation,
    formatFootnoteCitation,
    formatEndnoteCitation,
    formatAPACitation,
    formatAPAReference,
    formatMLACitation,
    formatMLAReference,
    formatChicagoCitation,
    generateCitations,
    extractCitationsFromText,
    generateReferenceList,
    sortCitationsByRelevance,
    deduplicateCitations,
    formatCitationForDisplay,
    generateCitationHTML,
    generateCitationMarkdown
};