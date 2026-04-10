import React from 'react';
import { X } from 'lucide-react';

interface CoppaPrivacyPolicyProps {
  onClose: () => void;
}

export const CoppaPrivacyPolicy: React.FC<CoppaPrivacyPolicyProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-indigo-900 to-black p-8 rounded-3xl border border-white/20 shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto text-white">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-indigo-900/90 p-4 rounded-xl z-10 backdrop-blur-md">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">
            Privacy Notice & Terms of Service
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-8 text-indigo-100/90 text-sm leading-relaxed">
          <p className="text-xs text-white/50 font-medium">Effective Date: March 30, 2026</p>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 border-b border-white/10 pb-2">1. Introduction</h3>
            <p className="mb-3">
              Welcome to MyCartoon ("we," "our," or "us"). We are dedicated to providing a fun, creative, and safe environment for users of all ages, especially children. 
              This document outlines our Privacy Policy and Terms of Service, detailing how we handle information and the rules for using our application.
            </p>
            <p>
              By accessing or using MyCartoon, you agree to be bound by these Terms of Service and acknowledge our Privacy Policy. If you are under 18, you must have a parent or legal guardian review and agree to these terms on your behalf.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 border-b border-white/10 pb-2">2. COPPA Privacy Notice</h3>
            <p className="mb-3">
              We take the privacy of our young users very seriously and are fully committed to complying with the Children's Online Privacy Protection Act (COPPA).
            </p>
            <div className="space-y-4 ml-4">
              <div>
                <strong className="text-white block mb-1">Information We Collect:</strong> 
                We do not knowingly collect, use, or disclose personally identifiable information (PII) from children under the age of 13 without verifiable parental consent. Our application is designed to function without requiring users to provide names, email addresses, or phone numbers.
              </div>
              <div>
                <strong className="text-white block mb-1">How We Use Information:</strong> 
                Any data generated during the cartoon creation process (e.g., prompts, scripts, scene descriptions) is processed securely to generate the requested content. We use this data solely to provide and improve the core functionality of the app.
              </div>
              <div>
                <strong className="text-white block mb-1">Third-Party Services:</strong> 
                We utilize third-party AI services (such as Google Gemini and Hugging Face) to generate text, images, and audio. These services act as our service providers and are restricted from using the generated content for their own independent purposes or for building profiles of our users.
              </div>
              <div>
                <strong className="text-white block mb-1">Data Retention:</strong> 
                We do not retain user-generated content longer than necessary to provide the service. Locally saved projects remain on your device.
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 border-b border-white/10 pb-2">3. Terms of Service</h3>
            <ul className="list-disc list-outside ml-5 space-y-3">
              <li>
                <strong className="text-white">Acceptable Use:</strong> Users must use MyCartoon for creative, educational, and entertainment purposes only. You agree not to use the service to generate harmful, offensive, explicit, violent, or otherwise inappropriate content. Our AI models are equipped with safety filters to prevent the generation of such content.
              </li>
              <li>
                <strong className="text-white">Intellectual Property:</strong> You retain ownership of the original prompts you provide. The generated content (scripts, images, audio, video) is provided to you for personal, non-commercial use. You may not use the generated content to infringe upon the intellectual property rights of others.
              </li>
              <li>
                <strong className="text-white">Service Availability:</strong> We strive to ensure high availability, but MyCartoon is provided on an "as is" and "as available" basis. We do not guarantee uninterrupted or error-free operation.
              </li>
              <li>
                <strong className="text-white">Purchases and Subscriptions:</strong> Any purchases made within the app (e.g., premium themes, voices, or subscriptions) are subject to our payment processor's terms. Refunds are handled on a case-by-case basis in accordance with applicable laws.
              </li>
              <li>
                <strong className="text-white">Termination:</strong> We reserve the right to suspend or terminate access to the service at any time, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 border-b border-white/10 pb-2">4. Parental Rights</h3>
            <p>
              Parents or legal guardians have the right to review any personal information we may have inadvertently collected from their child, request its deletion, and refuse to allow further collection or use of the child's information. To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 border-b border-white/10 pb-2">5. Changes to This Policy</h3>
            <p>
              We may update this Privacy Notice and Terms of Service from time to time to reflect changes in our practices or legal requirements. We will notify users of any material changes by posting the updated document within the application. Continued use of MyCartoon after such changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3 border-b border-white/10 pb-2">6. Contact Information</h3>
            <p className="mb-2">
              If you have any questions, concerns, or requests regarding our privacy practices or terms of service, please contact our privacy and support team at:
            </p>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 inline-block">
              <p className="font-bold text-white">privacy@mycartoon-app.example</p>
              <p className="text-xs text-white/50 mt-1">123 Animation Way, Creativity City, CC 12345</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
