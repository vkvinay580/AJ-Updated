<?php

namespace Tests\Unit;

use App\Models\AdminNotification;
use App\Models\EmployeeDeviceToken;
use App\Models\EmployeeNotificationDelivery;
use App\Services\FirebaseCloudMessagingService;
use ReflectionMethod;
use Tests\TestCase;

class FirebaseCloudMessagingServiceTest extends TestCase
{
    public function test_android_notifications_use_the_green_brand_color(): void
    {
        $deviceToken = new EmployeeDeviceToken([
            'token' => 'test-device-token',
            'platform' => 'android',
        ]);
        $notification = new AdminNotification([
            'title' => 'Test notification',
            'body' => 'Test body',
        ]);
        $notification->id = 12;
        $delivery = new EmployeeNotificationDelivery();
        $delivery->id = 34;

        $method = new ReflectionMethod(FirebaseCloudMessagingService::class, 'messagePayload');
        $method->setAccessible(true);
        $payload = $method->invoke(
            app(FirebaseCloudMessagingService::class),
            $deviceToken,
            $notification,
            $delivery
        );

        $this->assertSame('#006A64', $payload['android']['notification']['color']);
        $this->assertSame('admin_push_notifications', $payload['android']['notification']['channel_id']);
    }
}
