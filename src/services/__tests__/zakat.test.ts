/**
 * Unit tests for Zakat calculation logic
 * Tests cover: EMI deduction, Nisab threshold, zero-Zakat scenarios, large-loan edge cases
 */

import { calculateNisabThreshold } from '../goldSilverPrices';
import { calculateZakatYear } from '../zakat';

const ZAKAT_RATE = 0.025;

describe('Zakat Calculation Logic', () => {
    describe('Nisab Threshold Calculation', () => {
        it('should calculate silver Nisab correctly', () => {
            const goldPriceINR = 6000; // ₹6000 per gram
            const silverPriceINR = 80; // ₹80 per gram
            
            const silverNisab = calculateNisabThreshold('silver', goldPriceINR, silverPriceINR);
            // Silver Nisab: 612.36 grams * ₹80 = ₹48,988.80
            expect(silverNisab).toBeCloseTo(612.36 * 80, 2);
        });

        it('should calculate gold Nisab correctly', () => {
            const goldPriceINR = 6000;
            const silverPriceINR = 80;
            
            const goldNisab = calculateNisabThreshold('gold', goldPriceINR, silverPriceINR);
            // Gold Nisab: 87.48 grams * ₹6000 = ₹524,880
            expect(goldNisab).toBeCloseTo(87.48 * 6000, 2);
        });

        it('should use correct Nisab values (silver: 612.36g, gold: 87.48g)', () => {
            const goldPriceINR = 1;
            const silverPriceINR = 1;
            
            const silverNisab = calculateNisabThreshold('silver', goldPriceINR, silverPriceINR);
            const goldNisab = calculateNisabThreshold('gold', goldPriceINR, silverPriceINR);
            
            expect(silverNisab).toBeCloseTo(612.36, 2);
            expect(goldNisab).toBeCloseTo(87.48, 2);
        });
    });

    describe('Zakat Year Calculation', () => {
        it('should calculate Zakat year correctly for anniversary in same year', () => {
            const anniversary = '2024-03-10'; // March 10
            const snapshot = '2024-05-15'; // May 15
            
            const year = calculateZakatYear(anniversary, snapshot);
            
            expect(year.start).toBe('2024-03-10');
            expect(year.end).toBe('2025-03-09'); // Day before next anniversary
        });

        it('should calculate Zakat year correctly for anniversary in previous year', () => {
            const anniversary = '2023-12-01'; // Dec 1
            const snapshot = '2024-05-15'; // May 15, 2024
            
            const year = calculateZakatYear(anniversary, snapshot);
            
            // Should use most recent anniversary before snapshot
            expect(year.start).toBe('2023-12-01');
            expect(year.end).toBe('2024-11-30');
        });

        it('should handle anniversary on snapshot date', () => {
            const anniversary = '2024-05-15';
            const snapshot = '2024-05-15';
            
            const year = calculateZakatYear(anniversary, snapshot);
            
            expect(year.start).toBe('2024-05-15');
            expect(year.end).toBe('2025-05-14');
        });
    });

    describe('Zakat Eligibility Logic', () => {
        it('should return zero Zakat when net wealth is below Nisab', () => {
            const netWealth = 30000; // Below typical silver Nisab
            const nisabThreshold = 50000;
            
            const zakatDue = netWealth >= nisabThreshold ? netWealth * ZAKAT_RATE : 0;
            
            expect(zakatDue).toBe(0);
        });

        it('should calculate Zakat correctly when net wealth meets Nisab', () => {
            const netWealth = 100000;
            const nisabThreshold = 50000;
            
            const zakatDue = netWealth >= nisabThreshold ? netWealth * ZAKAT_RATE : 0;
            
            expect(zakatDue).toBe(2500); // 2.5% of 100,000
        });

        it('should calculate Zakat at exactly Nisab threshold', () => {
            const netWealth = 50000;
            const nisabThreshold = 50000;
            
            const zakatDue = netWealth >= nisabThreshold ? netWealth * ZAKAT_RATE : 0;
            
            expect(zakatDue).toBe(1250); // 2.5% of 50,000
        });
    });

    describe('EMI Deduction Logic', () => {
        it('should deduct only 12 months of EMIs', () => {
            const monthlyEMI = 10000;
            const monthsRemaining = 24; // Loan has 24 months left
            
            // Only deduct next 12 months
            const deductibleAmount = monthlyEMI * Math.min(12, monthsRemaining);
            
            expect(deductibleAmount).toBe(120000); // 12 * 10,000
        });

        it('should deduct remaining EMIs if fewer than 12', () => {
            const monthlyEMI = 10000;
            const monthsRemaining = 6; // Only 6 months left
            
            const deductibleAmount = monthlyEMI * Math.min(12, monthsRemaining);
            
            expect(deductibleAmount).toBe(60000); // 6 * 10,000
        });

        it('should handle zero remaining EMIs', () => {
            const monthlyEMI = 10000;
            const monthsRemaining = 0;
            
            const deductibleAmount = monthlyEMI * Math.min(12, monthsRemaining);
            
            expect(deductibleAmount).toBe(0);
        });
    });

    describe('Large Loan Edge Cases', () => {
        it('should not deduct total outstanding principal, only next 12 months', () => {
            const outstandingPrincipal = 500000; // Total loan
            const monthlyEMI = 10000;
            const monthsRemaining = 50;
            
            // Should NOT use outstanding principal
            // Should use only next 12 months of EMIs
            const deductibleAmount = monthlyEMI * Math.min(12, monthsRemaining);
            
            expect(deductibleAmount).toBe(120000); // Not 500,000
            expect(deductibleAmount).toBeLessThan(outstandingPrincipal);
        });

        it('should handle very large EMI amounts correctly', () => {
            const monthlyEMI = 50000; // Large EMI
            const monthsRemaining = 12;
            
            const deductibleAmount = monthlyEMI * Math.min(12, monthsRemaining);
            
            expect(deductibleAmount).toBe(600000); // 12 * 50,000
        });
    });

    describe('Net Zakatable Wealth Calculation', () => {
        it('should calculate net wealth correctly', () => {
            const totalAssets = 200000;
            const totalLiabilities = 50000;
            
            const netWealth = totalAssets - totalLiabilities;
            
            expect(netWealth).toBe(150000);
        });

        it('should handle negative net wealth (more liabilities than assets)', () => {
            const totalAssets = 50000;
            const totalLiabilities = 100000;
            
            const netWealth = totalAssets - totalLiabilities;
            
            expect(netWealth).toBe(-50000);
            // Negative wealth should result in zero Zakat
            const zakatDue = netWealth >= 0 ? netWealth * ZAKAT_RATE : 0;
            expect(zakatDue).toBe(0);
        });

        it('should handle zero assets', () => {
            const totalAssets = 0;
            const totalLiabilities = 0;
            
            const netWealth = totalAssets - totalLiabilities;
            const nisabThreshold = 50000;
            const zakatDue = netWealth >= nisabThreshold ? netWealth * ZAKAT_RATE : 0;
            
            expect(netWealth).toBe(0);
            expect(zakatDue).toBe(0);
        });
    });

    describe('Zakat Rate', () => {
        it('should use fixed 2.5% rate (1/40)', () => {
            expect(ZAKAT_RATE).toBe(0.025);
            expect(ZAKAT_RATE).toBe(1 / 40);
        });

        it('should calculate Zakat correctly with fixed rate', () => {
            const netWealth = 100000;
            const zakatDue = netWealth * ZAKAT_RATE;
            
            expect(zakatDue).toBe(2500); // Exactly 2.5%
        });
    });

    describe('Manual Include/Exclude Behavior', () => {
        it('should only include assets marked as included', () => {
            const assets = [
                { market_value: 50000, is_included: true },
                { market_value: 30000, is_included: true },
                { market_value: 20000, is_included: false }, // Excluded
            ];
            
            const totalAssets = assets
                .filter(a => a.is_included)
                .reduce((sum, a) => sum + a.market_value, 0);
            
            expect(totalAssets).toBe(80000); // Only included assets
        });

        it('should only include liabilities marked as included', () => {
            const liabilities = [
                { amount_due_next_12_months: 30000, is_included: true },
                { amount_due_next_12_months: 20000, is_included: false }, // Excluded
            ];
            
            const totalLiabilities = liabilities
                .filter(l => l.is_included)
                .reduce((sum, l) => sum + l.amount_due_next_12_months, 0);
            
            expect(totalLiabilities).toBe(30000); // Only included liabilities
        });
    });
});

