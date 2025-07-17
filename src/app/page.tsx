import Image from "next/image";
import { QrCode, Upload, Monitor, Check, Star, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Fotos und Videos live vom Event
              <br />
              <span className="text-blue-200">einsammeln & anzeigen</span>
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Moderne, minimalistische Event-Plattform für Live-Fotowände. 
              Gäste laden per QR-Code hoch, Sie zeigen alles in Echtzeit.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/auth" className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                Event erstellen
                <ArrowRight className="w-5 h-5" />
              </a>
              <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-colors">
                Live Demo ansehen
              </button>
            </div>
          </div>
        </div>
        
        {/* QR Code Mockup */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block">
          <div className="bg-white p-6 rounded-2xl shadow-2xl">
            <div className="w-32 h-32 bg-gray-900 rounded-lg flex items-center justify-center">
              <QrCode className="w-24 h-24 text-white" />
            </div>
            <p className="text-gray-600 text-sm mt-3 text-center">QR-Code scannen</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              So einfach geht&apos;s
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              In nur 3 Schritten zur live Event-Fotowand
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <QrCode className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">1. QR-Code scannen</h3>
              <p className="text-gray-600">
                Gäste scannen den QR-Code mit ihrem Smartphone oder nutzen den direkten Link
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">2. Fotos & Videos uploaden</h3>
              <p className="text-gray-600">
                Einfacher Upload von Bildern und Videos direkt vom Smartphone
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Monitor className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">3. Live-Fotowand anzeigen</h3>
              <p className="text-gray-600">
                Alle Uploads erscheinen sofort auf der Live-Fotowand für alle Gäste
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Alle Features im Überblick
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Alles was Sie für die perfekte Event-Fotowand brauchen
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Monitor className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Echtzeit-Slideshow</h3>
              <p className="text-gray-600">
                Alle Uploads erscheinen sofort auf der Live-Fotowand
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <QrCode className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">QR-Code Upload</h3>
              <p className="text-gray-600">
                Einfacher Zugang für alle Gäste über QR-Code
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Check className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">DSGVO-sicher</h3>
              <p className="text-gray-600">
                Datenschutz nach deutschen Standards
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Upload className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Foto & Video Support</h3>
              <p className="text-gray-600">
                Unterstützt alle gängigen Bild- und Videoformate
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Moderation</h3>
              <p className="text-gray-600">
                Alle Uploads vor der Anzeige prüfen und freigeben
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Monitor className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">TV-optimiert</h3>
              <p className="text-gray-600">
                Perfekt für große Bildschirme und Projektoren
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Einfache Preise
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Wählen Sie das passende Paket für Ihr Event
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-gray-50 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Starter</h3>
              <div className="text-4xl font-bold mb-6">
                Kostenlos
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Bis zu 50 Uploads</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>1 Event</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Grundfunktionen</span>
                </li>
              </ul>
              <button className="w-full bg-gray-200 text-gray-800 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors">
                Kostenlos starten
              </button>
            </div>

            {/* Pro */}
            <div className="bg-blue-600 text-white p-8 rounded-2xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-semibold">
                Beliebt
              </div>
              <h3 className="text-2xl font-bold mb-4">Pro</h3>
              <div className="text-4xl font-bold mb-6">
                29€
                <span className="text-xl font-normal">/Event</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-200" />
                  <span>Unbegrenzte Uploads</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-200" />
                  <span>Alle Features</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-200" />
                  <span>Passwort-Schutz</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-200" />
                  <span>Foto-Challenges</span>
                </li>
              </ul>
              <button className="w-full bg-white text-blue-600 py-3 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                Pro wählen
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-gray-50 p-8 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
              <div className="text-4xl font-bold mb-6">
                Individuell
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Mehrere Events</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Custom Branding</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Analytics</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Priority Support</span>
                </li>
              </ul>
              <button className="w-full bg-gray-200 text-gray-800 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors">
                Kontakt aufnehmen
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">LiveWall</h3>
              <p className="text-gray-400">
                Die moderne Event-Plattform für Live-Fotowände
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produkt</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Preise</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Unternehmen</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Über uns</a></li>
                <li><a href="#" className="hover:text-white">Kontakt</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Datenschutz</a></li>
                <li><a href="#" className="hover:text-white">AGB</a></li>
                <li><a href="#" className="hover:text-white">Impressum</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 LiveWall. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}