import { useEffect } from 'react';

interface SEOMetadata {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export function useSEO({ title, description, image, url }: SEOMetadata) {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title.includes('Bananinha Store') ? title : `${title} | Bananinha Store`;
    document.title = formattedTitle;

    // Helper to find or create meta tag
    const setMetaTag = (attrName: string, attrValue: string, contentValue: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);

    // 3. Open Graph (Facebook / WhatsApp / Instagram)
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', description);
    
    if (image) {
      setMetaTag('property', 'og:image', image);
    } else {
      setMetaTag('property', 'og:image', 'https://bananinha-store.pages.dev/logo.webp');
    }

    if (url) {
      setMetaTag('property', 'og:url', url);
    } else {
      setMetaTag('property', 'og:url', window.location.href);
    }

    setMetaTag('property', 'og:type', 'website');

    // 4. Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', description);
    if (image) {
      setMetaTag('name', 'twitter:image', image);
    } else {
      setMetaTag('name', 'twitter:image', 'https://bananinha-store.pages.dev/logo.webp');
    }

    // 5. Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', url || window.location.href);
  }, [title, description, image, url]);
}
