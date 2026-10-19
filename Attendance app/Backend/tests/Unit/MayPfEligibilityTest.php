<?php

namespace Tests\Unit;

use App\Support\MayPfEligibility;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\TestCase;

class MayPfEligibilityTest extends TestCase
{
    protected function tearDown(): void
    {
        MayPfEligibility::reset();

        parent::tearDown();
    }

    public function test_missing_optional_allowlist_does_not_break_salary_lookups(): void
    {
        if (is_file(MayPfEligibility::dataPath())) {
            $this->markTestSkipped('The optional private PF allowlist is installed in this environment.');
        }

        MayPfEligibility::reset();
        $month = Carbon::parse('2026-10-01');

        $this->assertSame('', MayPfEligibility::uanForEmployee('10001'));
        $this->assertFalse(MayPfEligibility::isEligible($month, '10001', null));
        $this->assertSame(0.0, MayPfEligibility::deductionFor($month, '10001', null, 1800));
        $this->assertSame(1800.0, MayPfEligibility::deductionFor($month, '10001', null, 1800, true));
    }
}
