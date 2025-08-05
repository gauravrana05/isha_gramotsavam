// src/app/[lang]/public/sports/throwball/rules/page.tsx
import React from 'react'
import Link from 'next/link'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import SectionDivider from '@/components/ui/SectionDivider'
import { ChevronLeft } from 'lucide-react'
import Image from 'next/image';
interface ThrowballRulesPageProps {
    params: {
        lang: string
    }
}

export default function ThrowballRulesPage({ params }: ThrowballRulesPageProps) {
    const { lang } = params

    return (
        <main className="min-h-screen font-fira bg-[url('/images/backgrounds/rules_background.jpg')]">
            {/* Hero Section */}
            <section className="py-16 bg-[url('/images/backgrounds/sports_background.png')]">
                <Container>
                    <div className="text-center">
                        <h1 className="text-3xl md:text-5xl lg:text-5xl font-semibold text-white mb-4 font-fira">
                            Isha Gramotsavam Volleyball (Men&apos;s) Rules
                        </h1>
                    </div>
                </Container>
            </section>
            <div className="">
                {/* Back Navigation */}
                <section className="py-4">
                    <Container>
                        <Link
                            href={`/${lang}/public/sports/throwball`}
                            className="inline-flex items-center text-[#F28C38] hover:text-[#4A2F1D] transition-colors font-fira font-semibold"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            Back to Throwball
                        </Link>
                    </Container>
                </section>

                {/* Registration Rules Section */}
                <section className=" py-12">
                    <Container>
                        <div className="max-w-4xl mx-auto">
                            <div className="prose prose-lg max-w-none">
                                <h2 className="text-3xl md:text-4xl font-bold text-[#4A2F1D] mb-8 font-fira">
                                    REGISTRATION RULES
                                </h2>

                                <ol className="space-y-6 text-[#4A2F1D] font-fira">
                                    <li>
                                        <p className="leading-relaxed">
                                            Online pre-registration is required for participation. Registration and team entry is free.
                                            (Travel allowance will be provided from divisional level matches.)
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            All the players in the team should be of the same Gram/Town panchayat. However, any number
                                            of teams can participate from the same panchayat. Teams from Municipality and Corporation
                                            are not eligible for the event.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            In one team, there should be a minimum of 7 players and 1 substitute (7+1), and a maximum
                                            of 7 players and 3 substitutes (7+3). One player can participate only in one team.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed mb-4">
                                            The minimum age for players is 13 and only a maximum of three persons will be allowed below
                                            21 years of age in a team. One physical education trainer (PET) can participate in one team.
                                            If the rules are found to be violated, the team will be disqualified at any stage of the tournament.
                                        </p>
                                        <p className="leading-relaxed pl-4">
                                            a. If any players are unable to participate, the team may continue with a minimum of 6 players,
                                            but not fewer. In such cases, medical certificates for the absent players must be submitted.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            School, college, and university students can participate in their panchayat teams. However,
                                            school, college, university, and reserve teams are not allowed to participate as a team.
                                            If the rules are found to be violated, the team will be disqualified at any stage of the tournament.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="font-bold mb-4">The following players cannot participate in the event:</p>
                                        <div className="space-y-3 pl-4">
                                            <p>
                                                <span className="font-semibold">a. International players:</span> Played against other
                                                international teams as part of the Indian team.
                                            </p>
                                            <p>
                                                <span className="font-semibold">b. National players:</span> Played against other Indian
                                                state teams as part of their respective state team.
                                            </p>
                                            <p>
                                                <span className="font-semibold">c. Appointment players:</span> Any players who played on
                                                a contract basis on behalf of the central or state government and private company teams.
                                            </p>
                                            <p>
                                                <span className="font-semibold">d. Central and state university players</span> and
                                                <span className="font-semibold"> players selected for integrated universities</span> (south zone)
                                                and <span className="font-semibold">Form 3 players</span> are not allowed to participate.
                                            </p>
                                            <p>
                                                <span className="font-semibold">e.</span> If the rules are found to be broken, the team
                                                will be disqualified at any stage of the tournament.
                                            </p>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* Match Rules Section */}
                <section className="py-12">
                    <Container>
                        <div className="max-w-4xl mx-auto">
                            <div className="prose prose-lg max-w-none">
                                <h2 className="text-3xl md:text-4xl font-bold text-[#4A2F1D] mb-8 font-fira">
                                    MATCH RULES
                                </h2>

                                <ol className="space-y-6 text-[#4A2F1D] font-fira">
                                    <li>
                                        <p className="leading-relaxed">
                                            On the match day, each individual player must bring their original Aadhaar card. If players
                                            fail to show their original ID cards, the results will be declared only after the verification
                                            of ID cards of all players. The management committee reserves the right to verify any additional
                                            proof of identity as needed to ascertain the identity of the players. If any team member fails
                                            to show their original Aadhaar card, the team will be rejected at any stage and the team in
                                            the next place will be declared the winner. No rematches will be held.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            Final decision regarding team participation will be made by the management committee.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            Matches will be conducted on a knockout/league basis.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            Only team players in the group photo submitted for their first match will be able to play
                                            in all the matches. The team players cannot be changed after the first level match.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            The management committee has the right to change any matches or match rules at any stage
                                            of the tournament.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            Players who consumed alcohol or used any kind of drugs will be banned from participation
                                            in the tournament.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            The main 7 players should arrive at the match venue and ensure their presence 30 minutes
                                            before the commencement of the match.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            If the players fail to arrive before the scheduled match start time, the opposing team
                                            will be declared the winner.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed font-semibold">
                                            The Standing Player Method will be used in all matches.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            If a team has a complaint against an opposing team or player, proper evidence should be
                                            submitted. Only then will action be taken. If the complaint is proven, that team or player
                                            will be disqualified at any stage and the team in the next place will be declared the winner.
                                            No rematches will be held.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            If there is any complaint regarding the participation of certain players or opposing teams,
                                            it must be reported at least three days in advance. Complaints raised after that will not
                                            be considered for action. If the complaint and evidence are proven to be true, necessary
                                            action will be taken against the team.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed font-semibold">
                                            The referee&apos;s decision is final.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            Only a team&apos;s captain can speak to the referee or management committee during a game.
                                            Coaches and other players are not allowed to argue. Failure to comply may result in
                                            the team being disqualified from the tournament.
                                        </p>
                                    </li>

                                    <li>
                                        <p className="leading-relaxed">
                                            If any team violates the above-mentioned rules, it will be disqualified at any stage
                                            of the tournament.
                                        </p>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* General Rules Section */}
                <section className="py-16">
                    <Container>
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-[#4A2F1D] mb-8 font-fira">
                                General Rules
                            </h2>
                            <SectionDivider type="decorative" />
                        </div>

                        <div className="max-w-4xl mx-auto">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-[#4A2F1D] mb-4 font-fira">
                                        • Assumption of Risk
                                    </h3>
                                    <p className="text-[#4A2F1D] leading-relaxed font-fira">
                                        Participants acknowledge and understand the inherent risks and dangers associated with
                                        participating in various sporting events under Isha Gramotsavam. Participants voluntarily
                                        assume all risks of personal injury, property damage, or other harm that may occur during
                                        the tournament.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-[#4A2F1D] mb-4 font-fira">
                                        • Waiver and Release of Liability
                                    </h3>
                                    <p className="text-[#4A2F1D] leading-relaxed font-fira">
                                        Participants, on behalf of themselves, their heirs, executors, and assigns, release and
                                        discharge the tournament organizers, sponsors, volunteers, officials, and all related
                                        parties from any and all liability for injuries, damages, or losses arising from their
                                        participation in the tournament.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-[#4A2F1D] mb-4 font-fira">
                                        • Indemnification
                                    </h3>
                                    <p className="text-[#4A2F1D] leading-relaxed font-fira">
                                        Participants agree to indemnify and hold harmless the tournament organizers, sponsors,
                                        volunteers, officials, and all related parties from any claims, demands, lawsuits, or
                                        actions arising from their participation in the tournament. Participants agree to reimburse
                                        the tournament organizers for any costs or expenses incurred as a result of defending
                                        against such claims or actions.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-[#4A2F1D] mb-4 font-fira">
                                        • Medical Treatment
                                    </h3>
                                    <p className="text-[#4A2F1D] leading-relaxed font-fira">
                                        Participants consent to receive necessary medical treatment or emergency care in the event
                                        of an injury during the tournament. Participants agree to bear all costs associated with
                                        medical treatment and assume all responsibility for any consequences arising from such treatment.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-[#4A2F1D] mb-4 font-fira">
                                        • Code of Conduct
                                    </h3>
                                    <p className="text-[#4A2F1D] leading-relaxed font-fira">
                                        Participants agree to adhere to the tournament&apos;s rules, regulations, and code of conduct
                                        prescribed by the organizers from time to time. Participants acknowledge that failure to
                                        comply with the rules and regulations may result in their removal from the tournament
                                        without any liability on the part of the organizers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

            </div>
        </main>
    )
}