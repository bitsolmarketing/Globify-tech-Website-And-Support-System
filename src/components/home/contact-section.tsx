import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { ContactForm } from '@/components/forms/contact-form'
import { GoogleMap } from '@/components/home/google-map'
import { Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Card } from '@/components/ui/card'
import { contactInfo, siteConfig } from '@/lib/site'
import { getCampaign } from '@/lib/data/campaign'
import { getCourseOptions } from '@/lib/data/courses'

export async function ContactSection() {
  const [campaign, courseOptions] = await Promise.all([getCampaign(), getCourseOptions()])

  const WHATSAPP_HREF = `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(
    `Assalam o Alaikum! I want to know more about the ${campaign.discountPercent}% OFF ${campaign.name} at ${siteConfig.name}.`,
  )}`

  return (
    <section aria-labelledby="contact-heading" className="section-y bg-white" id="contact">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="contact-heading"
            eyebrow="Get in touch"
            title="Book your free career counselling session"
            description="Tell us where you are now and where you want to be. We will recommend the right course honestly — and confirm your 50% Azadi discount."
          />
        </Reveal>

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          {/* ---------------------------------------------------- Details */}
          <Reveal direction="right" className="flex flex-col gap-6">
            <Card className="p-7 sm:p-8">
              <h3 className="font-sans text-lg font-bold text-ink-900">Contact details</h3>

              <ul className="mt-6 grid gap-5">
                <li>
                  <a
                    href={contactInfo.mapDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-900 group-hover:text-white">
                      <MapPin aria-hidden className="size-5" />
                    </span>
                    <span>
                      <span className="block font-sans text-sm font-bold text-ink-900">Campus</span>
                      <span className="block text-[0.9375rem] text-ink-500">
                        {contactInfo.address.street}, {contactInfo.address.locality},{' '}
                        {contactInfo.address.region} {contactInfo.address.postalCode}
                      </span>
                    </span>
                  </a>
                </li>

                <li>
                  <a href={`tel:${contactInfo.phoneHref}`} className="group flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-900 group-hover:text-white">
                      <Phone aria-hidden className="size-5" />
                    </span>
                    <span>
                      <span className="block font-sans text-sm font-bold text-ink-900">Phone</span>
                      <span className="block text-[0.9375rem] text-ink-500">
                        {contactInfo.phone} · {contactInfo.landline}
                      </span>
                    </span>
                  </a>
                </li>

                <li>
                  <a href={`mailto:${contactInfo.email}`} className="group flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800 transition-colors group-hover:bg-brand-900 group-hover:text-white">
                      <Mail aria-hidden className="size-5" />
                    </span>
                    <span>
                      <span className="block font-sans text-sm font-bold text-ink-900">Email</span>
                      <span className="block text-[0.9375rem] text-ink-500">
                        {contactInfo.email}
                      </span>
                    </span>
                  </a>
                </li>

                <li>
                  <a
                    href={WHATSAPP_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#25D366]/12 text-[#128C7E] transition-colors group-hover:bg-[#25D366] group-hover:text-white">
                      <MessageCircle aria-hidden className="size-5" />
                    </span>
                    <span>
                      <span className="block font-sans text-sm font-bold text-ink-900">
                        WhatsApp
                      </span>
                      <span className="block text-[0.9375rem] text-ink-500">
                        Fastest reply — usually within minutes
                      </span>
                    </span>
                  </a>
                </li>

                <li className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800">
                    <Clock aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block font-sans text-sm font-bold text-ink-900">
                      Opening hours
                    </span>
                    {contactInfo.openingHours.map((slot) => (
                      <span key={slot.days} className="block text-[0.9375rem] text-ink-500">
                        {slot.days}: {slot.time}
                      </span>
                    ))}
                  </span>
                </li>
              </ul>
            </Card>

            <GoogleMap className="min-h-72 flex-1" />
          </Reveal>

          {/* ------------------------------------------------------- Form */}
          <Reveal direction="left" delay={0.1}>
            <Card className="p-7 sm:p-9" id="enroll">
              <h3 className="font-sans text-lg font-bold text-ink-900">Send us a message</h3>
              <p className="mt-1.5 text-[0.9375rem] text-ink-500">
                Fill this in and our admissions team will call you within one working day.
              </p>

              <ContactForm courseOptions={courseOptions} className="mt-7" />
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
