<?php



use App\Models\Admin;

use App\Support\AdminMenu;

use Illuminate\Database\Migrations\Migration;

use Illuminate\Support\Facades\Hash;



return new class extends Migration

{

    public function up(): void

    {

        $admin = Admin::query()->firstOrNew([

            'email' => 'shwetha.singh@aryangold.app',

        ]);



        $admin->name = 'Shwetha Singh';

        $admin->phone = $admin->phone ?: null;

        $admin->address = $admin->address ?: null;

        $admin->image = $admin->image ?: null;

        $admin->password = Hash::make('Aryan Gold@916');

        $admin->password_hint = 'Aryan Gold@916';

        $admin->role = Admin::ROLE_CSR_MANAGER;

        $admin->position = 'CSR Manager';

        $admin->sidebar_menu_permissions = AdminMenu::defaultKeysForRole(Admin::ROLE_CSR_MANAGER);

        $admin->save();

    }



    public function down(): void

    {

        Admin::query()

            ->where('email', 'shwetha.singh@aryangold.app')

            ->where('role', Admin::ROLE_CSR_MANAGER)

            ->delete();

    }

};
