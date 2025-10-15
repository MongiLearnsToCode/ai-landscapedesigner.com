import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Mail, Send } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const contactData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    };
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (response.ok) {
        addToast('Message sent successfully! We\'ll get back to you soon.', 'success');
        form.reset();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addToast('Failed to send message. Please email us directly at support@ai-landscapedesigner.com', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full h-11 px-4 py-2 text-sm text-slate-800 bg-slate-100/80 border border-transparent rounded-lg outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400";
  const labelClasses = "block text-sm font-medium text-slate-700 mb-1.5";
  
  const ContactInfoItem: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="flex items-start">
      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-100 rounded-lg">
        {icon}
      </div>
      <div className="ml-4">
        <h4 className="text-base font-semibold text-slate-800">{title}</h4>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-200/80 flex flex-col md:flex-row min-h-[70vh]">
        {/* Left Panel: Image and Overlay */}
        <div className="md:w-1/3 relative bg-cover bg-center h-64 md:h-auto" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542281286-9e0a16bb7366?q=80&w=2070&auto=format&fit=crop')" }}>
          <div className="absolute inset-0 bg-slate-900/60 p-8 text-white flex flex-col justify-end">
            <div>
              <h2 className="text-3xl font-bold">We're here to help</h2>
              <p className="mt-2 text-slate-300">Your feedback and questions are important to us.</p>
            </div>
          </div>
        </div>
        
        {/* Right Panel: Form and Info */}
        <div className="md:w-2/3 p-8 sm:p-12">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Get in Touch
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Have a question or feedback? Fill out the form below and we'll get back to you as soon as possible.
          </p>

          <div className="mt-8">
            <ContactInfoItem icon={<Mail className="h-5 w-5 text-slate-600" />} title="Email Us">
              <a href="mailto:support@ai-landscapedesigner.com" className="text-orange-500 hover:underline">
                support@ai-landscapedesigner.com
              </a>
            </ContactInfoItem>
          </div>
          
          <hr className="my-8 border-slate-200/80" />

          <h3 className="text-2xl font-bold text-slate-800 mb-6">Send us a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className={labelClasses}>Full Name</label>
              <input type="text" name="name" id="name" required className={inputClasses} placeholder="John Doe" />
            </div>
            <div>
              <label htmlFor="email" className={labelClasses}>Email Address</label>
              <input type="email" name="email" id="email" required className={inputClasses} placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="message" className={labelClasses}>Message</label>
              <textarea name="message" id="message" rows={4} required className={`${inputClasses} h-auto`} placeholder="Your message..."></textarea>
            </div>
            <div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-11 flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
