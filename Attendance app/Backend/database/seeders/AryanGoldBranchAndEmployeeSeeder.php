<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AryanGoldBranchAndEmployeeSeeder extends Seeder
{
    private const ADMIN_USERNAME = 'admin';

    private const ADMIN_PASSWORD = 'AGBPL@916';

    private const EMPLOYEE_PASSWORD = '12345678';

    /** @var list<string> */
    private array $branchIds = ['AGBPL000', 'AGBPL001', 'AGBPL002', 'AGBPL003', 'AGBPL004'];

    /** @var list<string> */
    private array $employeeIds = ['10001', '10002', '10003', '10004', '10005'];

    public function run(): void
    {
        $now = now();

        $this->seedBranches();
        $employeeDatabaseIds = $this->seedEmployees($now);
        $this->pruneOldBranchesAndEmployees($employeeDatabaseIds);
        $this->seedEmployeeCredentials($employeeDatabaseIds, $now);
        $this->seedBranchOpeningData($employeeDatabaseIds, $now);
        $this->seedOnlyAdminLogin($now);
    }

    private function seedBranches(): void
    {
        $branches = [
            [
                'branchId' => 'AGBPL000',
                'branchName' => 'Head Office',
                'addressline' => 'Head Office, Bengaluru, Karnataka',
                'area' => 'Head Office',
                'city' => 'Bengaluru',
                'state' => 'Karnataka',
                'pincode' => '560094',
                'latitude' => '13.0589327',
                'longitude' => '77.5526715',
            ],
            [
                'branchId' => 'AGBPL001',
                'branchName' => 'Tambaram',
                'addressline' => 'Tambaram, Chennai, Tamil Nadu',
                'area' => 'Tambaram',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'pincode' => '600045',
                'latitude' => '12.9249000',
                'longitude' => '80.1000000',
            ],
            [
                'branchId' => 'AGBPL002',
                'branchName' => 'Adyar',
                'addressline' => 'Adyar, Chennai, Tamil Nadu',
                'area' => 'Adyar',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'pincode' => '600020',
                'latitude' => '13.0067000',
                'longitude' => '80.2574000',
            ],
            [
                'branchId' => 'AGBPL003',
                'branchName' => 'Malleshwaram',
                'addressline' => 'Malleshwaram, Bengaluru, Karnataka',
                'area' => 'Malleshwaram',
                'city' => 'Bengaluru',
                'state' => 'Karnataka',
                'pincode' => '560003',
                'latitude' => '13.0031000',
                'longitude' => '77.5643000',
            ],
            [
                'branchId' => 'AGBPL004',
                'branchName' => 'T Nagar',
                'addressline' => 'T Nagar, Chennai, Tamil Nadu',
                'area' => 'T Nagar',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'pincode' => '600017',
                'latitude' => '13.0418000',
                'longitude' => '80.2341000',
            ],
        ];

        foreach ($branches as $branch) {
            DB::table('wp_branches_database')->updateOrInsert(
                ['branchId' => $branch['branchId']],
                $branch + [
                    'timings' => '9:30 AM - 6:30 PM',
                    'url' => sprintf(
                        'https://www.google.com/maps/search/?api=1&query=%s,%s',
                        $branch['latitude'],
                        $branch['longitude']
                    ),
                    'status' => 1,
                ]
            );
        }
    }

    /**
     * @return array<string, int>
     */
    private function seedEmployees($now): array
    {
        $employees = [
            [
                'empId' => '10001',
                'name' => 'Vinay',
                'designation' => 'Head Office Employee',
                'mailId' => 'vinay@aryangold.local',
                'branchId' => 'AGBPL000',
                'address' => 'Head Office, Bengaluru',
            ],
            [
                'empId' => '10002',
                'name' => 'Tambaram Employee',
                'designation' => 'Branch Employee',
                'mailId' => 'tambaram.employee@aryangold.local',
                'branchId' => 'AGBPL001',
                'address' => 'Tambaram, Chennai',
            ],
            [
                'empId' => '10003',
                'name' => 'Adyar Employee',
                'designation' => 'Branch Employee',
                'mailId' => 'adyar.employee@aryangold.local',
                'branchId' => 'AGBPL002',
                'address' => 'Adyar, Chennai',
            ],
            [
                'empId' => '10004',
                'name' => 'Malleshwaram Employee',
                'designation' => 'Branch Employee',
                'mailId' => 'malleshwaram.employee@aryangold.local',
                'branchId' => 'AGBPL003',
                'address' => 'Malleshwaram, Bengaluru',
            ],
            [
                'empId' => '10005',
                'name' => 'T Nagar Employee',
                'designation' => 'Branch Employee',
                'mailId' => 'tnagar.employee@aryangold.local',
                'branchId' => 'AGBPL004',
                'address' => 'T Nagar, Chennai',
            ],
        ];

        foreach ($employees as $employee) {
            DB::table('employee')->updateOrInsert(
                ['empId' => $employee['empId']],
                [
                    'name' => $employee['name'],
                    'contact' => '',
                    'mailId' => $employee['mailId'],
                    'address' => $employee['address'],
                    'location' => $employee['branchId'],
                    'assigned_branch_id' => $employee['branchId'],
                    'designation' => $employee['designation'],
                    'status' => 'Active',
                    'last_login_branch_id' => $employee['branchId'],
                    'attendance_blocked_on' => null,
                    'attendance_unblocked_on' => null,
                    'inactive_reason' => null,
                    'last_working_date' => null,
                    'is_night_shift' => 0,
                    'is_outsourced' => 0,
                    'gender' => null,
                    'marital_status' => null,
                    'remark' => null,
                    'advance' => 0,
                    'pf' => 0,
                    'pf_eligible' => 0,
                    'pfsecuritydeposit' => 0,
                ]
            );
        }

        return DB::table('employee')
            ->whereIn('empId', $this->employeeIds)
            ->pluck('id', 'empId')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }

    /**
     * @param array<string, int> $employeeDatabaseIds
     */
    private function pruneOldBranchesAndEmployees(array $employeeDatabaseIds): void
    {
        Schema::disableForeignKeyConstraints();

        try {
            $tables = DB::select('SHOW TABLES');
            $databaseName = DB::getDatabaseName();
            $tableKey = 'Tables_in_'.$databaseName;

            foreach ($tables as $tableRow) {
                $table = $tableRow->{$tableKey} ?? reset($tableRow);

                if (! is_string($table) || in_array($table, ['migrations', 'password_resets', 'failed_jobs'], true)) {
                    continue;
                }

                $columns = Schema::getColumnListing($table);
                $query = DB::table($table);
                $shouldDelete = false;

                if ($table === 'admins') {
                    continue;
                }

                if ($table === 'employee') {
                    $query->where(function ($employeeQuery): void {
                        $employeeQuery
                            ->whereNull('empId')
                            ->orWhere('empId', '')
                            ->orWhereNotIn('empId', $this->employeeIds);
                    });
                    $shouldDelete = true;
                } elseif ($table === 'wp_branches_database') {
                    $query->whereNotIn('branchId', $this->branchIds);
                    $shouldDelete = true;
                } else {
                    $query->where(function ($subQuery) use ($columns, $employeeDatabaseIds): void {
                        $hasConditions = false;

                        if (in_array('employee_id', $columns, true)) {
                            $subQuery->orWhereNotIn('employee_id', array_values($employeeDatabaseIds));
                            $hasConditions = true;
                        }

                        if (in_array('emp_id', $columns, true)) {
                            $subQuery->orWhereNotIn('emp_id', $this->employeeIds);
                            $hasConditions = true;
                        }

                        if (in_array('employeeId', $columns, true)) {
                            $subQuery->orWhereNotIn('employeeId', $this->employeeIds);
                            $hasConditions = true;
                        }

                        if (in_array('branchId', $columns, true)) {
                            $subQuery->orWhereNotIn('branchId', $this->branchIds);
                            $hasConditions = true;
                        }

                        foreach (['branch_id', 'check_in_branch_id', 'check_out_branch_id', 'deployed_branch_id'] as $branchColumn) {
                            if (in_array($branchColumn, $columns, true)) {
                                $subQuery->orWhere(function ($branchQuery) use ($branchColumn): void {
                                    $branchQuery
                                        ->whereNotNull($branchColumn)
                                        ->where($branchColumn, '!=', '')
                                        ->whereNotIn($branchColumn, $this->branchIds);
                                });
                                $hasConditions = true;
                            }
                        }

                        if (! $hasConditions) {
                            $subQuery->whereRaw('1 = 0');
                        }
                    });

                    $shouldDelete = true;
                }

                if ($shouldDelete) {
                    $query->delete();
                }
            }

            if (Schema::hasTable('personal_access_tokens')) {
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', 'App\\Models\\Employee')
                    ->whereNotIn('tokenable_id', array_values($employeeDatabaseIds))
                    ->delete();
            }
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }

    /**
     * @param array<string, int> $employeeDatabaseIds
     */
    private function seedEmployeeCredentials(array $employeeDatabaseIds, $now): void
    {
        $employeeBranches = [
            '10001' => 'AGBPL000',
            '10002' => 'AGBPL001',
            '10003' => 'AGBPL002',
            '10004' => 'AGBPL003',
            '10005' => 'AGBPL004',
        ];

        foreach ($employeeBranches as $empId => $branchId) {
            DB::table('employee_app_credentials')->updateOrInsert(
                ['emp_id' => $empId, 'branch_id' => $branchId],
                [
                    'employee_id' => $employeeDatabaseIds[$empId],
                    'password_hash' => Hash::make(self::EMPLOYEE_PASSWORD),
                    'password_set_at' => $now,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }

    /**
     * @param array<string, int> $employeeDatabaseIds
     */
    private function seedBranchOpeningData(array $employeeDatabaseIds, $now): void
    {
        if (Schema::hasTable('branch_opening_assignments')) {
            DB::table('branch_opening_assignments')
                ->where('branch_id', 'AGBPL000')
                ->delete();

            $branchEmployees = [
                'AGBPL001' => $employeeDatabaseIds['10002'],
                'AGBPL002' => $employeeDatabaseIds['10003'],
                'AGBPL003' => $employeeDatabaseIds['10004'],
                'AGBPL004' => $employeeDatabaseIds['10005'],
            ];

            foreach ($branchEmployees as $branchId => $employeeId) {
                foreach (['opening', 'closing'] as $assignmentType) {
                    DB::table('branch_opening_assignments')->updateOrInsert(
                        [
                            'branch_id' => $branchId,
                            'employee_id' => $employeeId,
                            'assignment_type' => $assignmentType,
                        ],
                        [
                            'assigned_by' => null,
                            'updated_at' => $now,
                            'created_at' => $now,
                        ]
                    );
                }
            }
        }

        if (Schema::hasTable('branch_opening_settings')) {
            DB::table('branch_opening_settings')
                ->where('branch_id', 'AGBPL000')
                ->delete();

            foreach (array_slice($this->branchIds, 1) as $branchId) {
                DB::table('branch_opening_settings')->updateOrInsert(
                    ['branch_id' => $branchId],
                    [
                        'opening_time' => '09:30:00',
                        'admin_phone' => null,
                        'updated_by' => null,
                        'updated_at' => $now,
                        'created_at' => $now,
                    ]
                );
            }
        }
    }

    private function seedOnlyAdminLogin($now): void
    {
        DB::table('admins')
            ->where('email', '!=', self::ADMIN_USERNAME)
            ->delete();

        DB::table('admins')->updateOrInsert(
            ['email' => self::ADMIN_USERNAME],
            [
                'name' => self::ADMIN_USERNAME,
                'phone' => null,
                'address' => null,
                'image' => null,
                'theme_preference' => 'aryan-gold-theme',
                'card_style' => 'rounded',
                'table_density' => 'comfortable',
                'sidebar_collapsed' => 0,
                'theme_primary_color' => '#006E6C',
                'theme_background_color' => '#FFF7EA',
                'theme_surface_color' => '#FFFFFF',
                'theme_sidebar_background_color' => '#073B3A',
                'theme_text_color' => '#1E2A2A',
                'theme_muted_text_color' => '#6D7A7A',
                'theme_border_color' => '#E9D7B8',
                'password' => Hash::make(self::ADMIN_PASSWORD),
                'password_hint' => '',
                'role' => 'hr_admin',
                'position' => 'Admin',
                'updated_at' => $now,
                'created_at' => $now,
            ]
        );
    }
}
