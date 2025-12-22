import { DASHBOARD_FILTER_CONFIG, RECIPIENT_SPOTLIGHT_FILTER_CONFIG } from '../constants';

describe('RegionalDashboard constants', () => {
  describe('RECIPIENT_SPOTLIGHT_FILTER_CONFIG', () => {
    it('exports RECIPIENT_SPOTLIGHT_FILTER_CONFIG', () => {
      expect(RECIPIENT_SPOTLIGHT_FILTER_CONFIG).toBeDefined();
    });

    it('contains exactly 8 filters', () => {
      expect(RECIPIENT_SPOTLIGHT_FILTER_CONFIG).toHaveLength(8);
    });

    it('includes all required filters', () => {
      const filterIds = RECIPIENT_SPOTLIGHT_FILTER_CONFIG.map((filter) => filter.id);

      expect(filterIds).toContain('grantNumber'); // Grant number
      expect(filterIds).toContain('group'); // Group
      expect(filterIds).toContain('recipientsWithoutTTA'); // Last TTA
      expect(filterIds).toContain('programSpecialist'); // Program specialist
      expect(filterIds).toContain('priorityIndicator'); // Priority indicator (NEW)
      expect(filterIds).toContain('programType'); // Program types
      expect(filterIds).toContain('region'); // Region
      expect(filterIds).toContain('stateCode'); // State or territory
    });

    it('filters are sorted alphabetically by display name', () => {
      const displays = RECIPIENT_SPOTLIGHT_FILTER_CONFIG.map((filter) => filter.display);
      const sortedDisplays = [...displays].sort((a, b) => a.localeCompare(b));

      expect(displays).toEqual(sortedDisplays);
    });

    it('all filters have required properties', () => {
      RECIPIENT_SPOTLIGHT_FILTER_CONFIG.forEach((filter) => {
        expect(filter).toHaveProperty('id');
        expect(filter).toHaveProperty('display');
        expect(filter).toHaveProperty('conditions');
        expect(filter).toHaveProperty('defaultValues');
        expect(filter).toHaveProperty('renderInput');
      });
    });
  });

  describe('DASHBOARD_FILTER_CONFIG', () => {
    it('exports DASHBOARD_FILTER_CONFIG', () => {
      expect(DASHBOARD_FILTER_CONFIG).toBeDefined();
    });

    it('contains more filters than RECIPIENT_SPOTLIGHT_FILTER_CONFIG', () => {
      expect(DASHBOARD_FILTER_CONFIG.length).toBeGreaterThan(
        RECIPIENT_SPOTLIGHT_FILTER_CONFIG.length,
      );
    });

    it('filters are sorted alphabetically by display name', () => {
      const displays = DASHBOARD_FILTER_CONFIG.map((filter) => filter.display);
      const sortedDisplays = [...displays].sort((a, b) => a.localeCompare(b));

      expect(displays).toEqual(sortedDisplays);
    });
  });
});
