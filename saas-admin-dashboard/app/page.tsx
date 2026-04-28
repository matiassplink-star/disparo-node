// Landing Page — Server Component (SEO + JSON-LD)
// Toda a UI interativa está em <Landing /> (client component)

import Landing from '@/components/landing/Landing'

export default function Home() {
  return (
    <>
      <Landing />

      {/* JSON-LD Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'ZapLink',
            operatingSystem: 'Windows, Linux, macOS',
            applicationCategory: 'BusinessApplication',
            offers: {
              '@type': 'Offer',
              price: '49.90',
              priceCurrency: 'BRL',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '3400',
            },
            description:
              'Sistema profissional de automação e disparos em massa no WhatsApp com IA e anti-ban.',
          }),
        }}
      />
    </>
  )
}
