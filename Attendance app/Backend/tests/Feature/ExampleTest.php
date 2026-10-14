<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     *
     * @return void
     */
    public function test_the_android_update_endpoint_returns_release_metadata(): void
    {
        $response = $this->getJson('/api/app/update');

        $response
            ->assertOk()
            ->assertJsonPath('update.platform', 'android')
            ->assertJsonPath('update.packageName', 'aryan.attendance')
            ->assertJsonStructure([
                'update' => [
                    'latestVersion',
                    'latestBuildNumber',
                    'minimumSupportedBuildNumber',
                    'downloadUrl',
                ],
            ]);
    }
}
