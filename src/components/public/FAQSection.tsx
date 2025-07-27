// src/components/public/FAQSection.tsx
'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Container from '../ui/Container'
import SectionDivider from '../ui/SectionDivider'

export default function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqs = [
    {
      id: 1,
      category: "General Information",
      question: "What is Isha Gramotsavam?",
      answer: '"Gramotsavam" translates to "celebration of village life." Isha Gramotsavam is an annual sports festival that promotes sporting culture among rural India and showcases the essence of rural life through an elaborate display of rural games, art, drama, dance, music and food.'
    },
    {
      id: 2,
      category: "General Information",
      question: "When is Gramotsavam happening?",
      answer: "Gramotsavam will take place from August 2025 to September 2025."
    },
    {
      id: 3,
      category: "General Information",
      question: "How can I participate in Isha Gramotsavam?",
      answer: "You can participate by: 1) Registering your team for one of the sports and compete, 2) Volunteering for the event, 3) Attending the finals at Isha Yoga Center Coimbatore."
    },
    {
      id: 4,
      category: "Eligibility",
      question: "What is the age limit to participate in the event?",
      answer: "For Volleyball and Kabaddi, the minimum age is 14 years. For Throwball, the minimum age is 13 years. Only three players below 21 years of age are allowed in a team. There is no maximum age limit as long as one is physically fit."
    },
    {
      id: 5,
      category: "Registration",
      question: "Can I register on the day of the event?",
      answer: "No, online registration is mandatory and should be completed before the registration deadline."
    },
    {
      id: 6,
      category: "Rules",
      question: "My teammate is in another gram panchayat. Can we form a team?",
      answer: "All players in the team should be from the same gram panchayat or town panchayat. However, any number of teams can participate from the same panchayat. Teams from municipalities and corporations are not eligible for the event."
    }
  ];

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  return (
    <section className="bg-[#F3F0E5] py-16 lg:py-24">
      <Container>
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold text-[#4A2F1D] mb-8 font-fira">
            Frequently Asked Questions
          </h2>
          <SectionDivider type="decorative" className="my-8" />
        </div>

        <div className="max-w-4xl mx-auto">
          {categories.map((category) => (
            <div key={category} className="mb-8">
              <h3 className="text-2xl font-semibold text-[#F28C38] mb-6 font-fira">
                {category}
              </h3>
              
              <div className="space-y-4">
                {faqs
                  .filter(faq => faq.category === category)
                  .map((faq) => (
                    <div
                      key={faq.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-[#4A2F1D] font-fira">
                          {faq.question}
                        </span>
                        {openFAQ === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-[#F28C38] flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#F28C38] flex-shrink-0" />
                        )}
                      </button>
                      
                      {openFAQ === faq.id && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-700 leading-relaxed font-fira">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}