import React from 'react'; // v18.2+
import { useTheme } from '@mui/material'; // v5.0+
import {
  FooterContainer,
  FooterContent,
  FooterLinks,
  FooterCopyright
} from './Footer.styles';

// Footer navigation links configuration
const FOOTER_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Contact', href: '/contact' }
] as const;

/**
 * Footer component implementing responsive design, theme support, and accessibility features
 * following Material Design 3.0 principles and WCAG 2.1 Level AA guidelines.
 */
const Footer: React.FC = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer
      role="contentinfo"
      aria-label="Site footer"
      theme={theme}
    >
      <FooterContent>
        <FooterLinks
          role="navigation"
          aria-label="Footer navigation"
        >
          {FOOTER_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              aria-label={label}
              role="link"
              tabIndex={0}
            >
              {label}
            </a>
          ))}
        </FooterLinks>

        <FooterCopyright
          aria-label="Copyright information"
        >
          © {currentYear} Multi-Touch Attribution Analytics. All rights reserved.
        </FooterCopyright>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer;