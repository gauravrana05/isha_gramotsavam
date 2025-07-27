import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui';

export default function SportsOverviewPage() {
  return (
    <div className="bg-[#F3F0E5]">
      {/* Hero Section with Background Images */}
      <section className="relative bg-[#F3F0E5] py-16 overflow-hidden md:min-h-screen flex flex-col" >
        <div className="absolute inset-0">

          <Image
            src="/images/backgrounds/sports_background.png"
            alt="Sports Background"
            fill
            className=""
            priority
            quality={100}
          />

          {/* Darkening Overlay */}
          <div className="absolute inset-0 bg-black/10"></div>
        </div>


        {/* Background Decorative Images */}
        <div className="absolute inset-0">
          <Image
            src="/images/backgrounds/gramotsavam_sports_background_ladder.png"
            alt="Background decoration"
            width={50}
            height={1000}
            className=" absolute left-0 top-0 opacity-90 hidden md:block"
          />
          <Image
            src="/images/backgrounds/gramotsavam_sports_background_ladder_right.png"
            alt="Background decoration"
            width={52}
            height={1000}
            className="absolute right-0 top-0 opacity-90 hidden md:block"
          />
          <Image
            src="/images/backgrounds/grms_sports_bg_bottom_left_doll.png"
            alt="Background decoration"
            width={40}
            height={60}
            className="absolute left-15 bottom-0 opacity-90"
          />
          <Image
            src="/images/backgrounds/grms_sports_bg_bottom_right_doll.png"
            alt="Background decoration"
            width={60}
            height={80}
            className="absolute right-15 bottom-0 opacity-90 "
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-fira">
              Sports at Isha Gramotsavam
            </h1>
            <p className="text-lg md:text-xl text-isha-saffron mb-8 leading-relaxed font-fira">
              Aug - Sep 2025
            </p>
            <div className=" rounded-xl p-6 mb-4 md:px-24 md:mx-24 md:my-8">
              <p className="text-md md:text-xl text-white leading-relaxed font-fira">
                Volleyball, throwball and kabaddi matches are conducted at three levels: clusters, divisionals, and finals.
              </p>
            </div>
            
            {/* Decorative Element */}
            <div className="flex justify-center mb-8">
              <Image
                src="/images/icons/public_decorator_4.png"
                alt="Decorative divider"
                width={240}
                height={80}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      

      {/* Sports Statistics Banner */}
      <div className="relative bg-earth-brown text-white py-2 md:pt-48 pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">2+</div>
              <div className="text-sm md:text-base font-fira">Traditional Sports</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">18,000+</div>
              <div className="text-sm md:text-base font-fira">Teams Participating</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">2,00,000+</div>
              <div className="text-sm md:text-base font-fira">Players</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-isha-saffron font-fira">35,000+</div>
              <div className="text-sm md:text-base font-fira">Villages</div>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* Sports Overview */}
      <section id="sports-details" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-earth-brown mb-4 font-fira">
              Our Sports
            </h2>
            <p className="text-lg text-earth-brown/80 max-w-2xl mx-auto font-fira">
              Discover the traditional Indian sports that bring communities together in the spirit of healthy competition
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Volleyball Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow font-fira">
              <div className="relative h-100">
                <Image
                  src="/images/sports/volleyball_2.jpg"
                  alt="Volleyball at Gramotsavam"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-earth-brown mb-3 font-fira">Volleyball</h3>
                <p className="text-earth-brown/80 mb-4 leading-relaxed font-fira">
                  The most popular sport at Gramotsavam, volleyball brings teams together in intense, 
                  fast-paced matches. Experience the thrill of teamwork and precision in this beloved traditional game.
                </p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-earth-brown mb-2">Key Features:</h4>
                  <ul className="list-disc list-inside text-sm text-earth-brown/80 space-y-1 font-fira">
                    <li>6 players per team on court</li>
                    <li>Best of 3 sets format</li>
                    <li>Mens teams allowed</li>
                    <li>Village-level tournament structure</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-earth-brown mb-2 font-fira">Prize Structure:</h4>
                  <div className="text-sm text-earth-brown/80 font-fira">
                    <div className="flex justify-between">
                      <span>Finals Winner:</span>
                      <span className="font-semibold">₹5,00,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Division Winner:</span>
                      <span className="font-semibold">₹25,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cluster Winner:</span>
                      <span className="font-semibold">₹10,000</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link 
                    href="/en/public/sports/volleyball" 
                    className="flex-1 bg-saffron lg:pl-3 py-2 rounded-lg font-semibold hover:bg-saffron/90 transition-colors"
                  >
                    Learn More
                  </Link>
                  <Button size="small" className="min-w-[200px]">
                    Register Now
                  </Button>
                </div>
              </div>
            </div>

            {/* Throwball Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow font-fira">
              <div className="relative h-100">
                <Image
                  src="/images/sports/throwball_1.jpg"
                  alt="Throwball at Gramotsavam"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-earth-brown mb-3">Throwball</h3>
                <p className="text-earth-brown/80 mb-4 leading-relaxed">
                  A dynamic sport that combines agility, strategy, and teamwork. Popular among women participants, 
                  throwball showcases incredible athleticism and community spirit.
                </p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-earth-brown mb-2">Key Features:</h4>
                  <ul className="list-disc list-inside text-sm text-earth-brown/80 space-y-1">
                    <li>7 players per team on court</li>
                    <li>Best of 3 sets format</li>
                    <li>Womens team allowed</li>
                    <li>High-energy gameplay</li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-earth-brown mb-2">Prize Structure:</h4>
                  <div className="text-sm text-earth-brown/80">
                    <div className="flex justify-between">
                      <span>Finals Winner:</span>
                      <span className="font-semibold">₹5,00,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Division Winner:</span>
                      <span className="font-semibold">₹25,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cluster Winner:</span>
                      <span className="font-semibold">₹10,000</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Link 
                    href="/en/public/sports/throwball" 
                    className="flex-1 bg-saffron lg:pl-3 py-2 rounded-lg font-semibold hover:bg-saffron/90 transition-colors"
                  >
                    Learn More
                  </Link>
                  <Button size="small" className="min-w-[200px]">
                    Register Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}