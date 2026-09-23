import { describe, it, expect } from 'vitest';
import { providerDomain, providerLogoUrl } from '../utils/logo';
import { PROVIDERS } from '../constants/providers';

describe('providerDomain', () => {
  it('uses the preset domain, ignoring case and accents', () => {
    expect(providerDomain('Conad')).toBe('conad.it');
    expect(providerDomain('  tigota ')).toBe('tigota.it');
    expect(providerDomain('ikea family')).toBe('ikea.com');
    expect(providerDomain('Coop')).toBe('e-coop.it');
  });

  it('lets a longer name borrow the preset it starts with', () => {
    expect(providerDomain('Conad Superstore')).toBe('conad.it');
    expect(providerDomain('Lidl Plus')).toBe('lidl.it');
  });

  it('does not match a preset that is only a prefix of another word', () => {
    expect(providerDomain('MDF Arredi')).toBe('mdfarredi.it');
    expect(providerDomain('Coopervision')).toBe('coopervision.it');
  });

  it('guesses <name>.it for other shops', () => {
    expect(providerDomain('Bennet')).toBe('bennet.it');
    expect(providerDomain('Brico Center')).toBe('bricocenter.it');
    expect(providerDomain('Crai & Co.')).toBe('craieco.it');
  });

  it('gives up on names with nothing usable', () => {
    expect(providerDomain('')).toBeNull();
    expect(providerDomain(undefined)).toBeNull();
    expect(providerDomain('★')).toBeNull();
    expect(providerDomain('X')).toBeNull();
  });

  it('has a domain for every preset', () => {
    for (const p of PROVIDERS) {
      expect(p.domain, p.name).toMatch(/^[a-z0-9-]+(\.[a-z]+)+$/);
    }
  });
});

describe('providerLogoUrl', () => {
  it('builds the logo service URL', () => {
    expect(providerLogoUrl('Esselunga')).toBe('https://www.google.com/s2/favicons?domain=esselunga.it&sz=128');
  });

  it('returns null when there is no domain', () => {
    expect(providerLogoUrl('')).toBeNull();
  });
});
