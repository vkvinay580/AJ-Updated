<?php

namespace Tests\Feature;

use Tests\TestCase;

class FrontendWebControllerTest extends TestCase
{
    public function test_flutter_web_assets_have_explicit_content_types(): void
    {
        $this->get('/flutter_bootstrap.js')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/javascript; charset=UTF-8');

        $this->get('/assets/AssetManifest.bin')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/octet-stream');

        $this->get('/canvaskit/canvaskit.wasm')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/wasm');
    }
}
