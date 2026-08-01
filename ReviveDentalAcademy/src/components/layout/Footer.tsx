import { Link } from 'react-router-dom';
import { Mail, Clock, Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#161B21] border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex flex-col mb-6">
              <span className="text-white font-bold text-2xl tracking-tight leading-none">Revive</span>
              <span className="text-secondary text-[10px] uppercase tracking-[0.2em] font-medium font-sans">Dental Academy</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Premium, practical dental insurance training designed to help offices master verification and reduce denials.
            </p>
            <div className="flex space-x-4">
              <Shield className="h-5 w-5 text-secondary/40" />
              <span className="text-xs text-gray-500 italic">Consulting-Grade Excellence</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Academy Programs</h4>
            <ul className="space-y-4">
              <li><Link to="/courses" className="text-gray-400 hover:text-secondary text-sm transition-colors">Insurance Bootcamp</Link></li>
              <li><Link to="/courses" className="text-gray-400 hover:text-secondary text-sm transition-colors">Mastering AR Collection</Link></li>
              <li><Link to="/courses" className="text-gray-400 hover:text-secondary text-sm transition-colors">Front Desk Excellence</Link></li>
              <li><Link to="/membership" className="text-gray-400 hover:text-secondary text-sm transition-colors">Office Pro Membership</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Resources</h4>
            <ul className="space-y-4">
              <li><Link to="/templates" className="text-gray-400 hover:text-secondary text-sm transition-colors">SOP Library</Link></li>
              <li><Link to="/templates" className="text-gray-400 hover:text-secondary text-sm transition-colors">Email Templates</Link></li>
              <li><Link to="/templates" className="text-gray-400 hover:text-secondary text-sm transition-colors">Phone Scripts</Link></li>
              <li><Link to="/resources" className="text-gray-400 hover:text-secondary text-sm transition-colors">Blog & Case Studies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-xs">Support</h4>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3 text-gray-400">
                <Mail className="h-4 w-4 text-secondary" />
                <span className="text-sm">support@revivedental.com</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-400">
                <Clock className="h-4 w-4 text-secondary" />
                <span className="text-sm">Mon - Fri: 9am - 5pm EST</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Revive Dental Academy. All rights reserved.
          </p>
          <div className="flex space-x-8">
            <Link to="/privacy" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
