import { test, expect } from '@playwright/test';

test.describe('Sports E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    // Estado en memoria simulando la Base de Datos para estos tests
    const mockDb = [
      {
        id: 'sport-1',
        name: 'Fútbol',
        description: 'El deporte más popular del mundo',
        maxCapacity: 20,
        additionalPrice: 500,
        requiresMedicalCertificate: false,
      },
    ];

    // Interceptamos todas las llamadas de red hacia el backend
    // De este modo los tests son resilientes y no dependen de PostgreSQL
    await page.route(/\/api\/v1\/deportes/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb }),
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newSport = {
          id: String(mockDb.length + 1),
          ...payload,
        };
        mockDb.push(newSport);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newSport }),
        });
      } else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      } else if (method === 'PUT') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockDb.findIndex(s => String(s.id) === String(id));

        if (index > -1) {
          mockDb[index] = { ...mockDb[index], ...payload };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockDb[index] }),
          });
        }
      } else if (method === 'DELETE') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const index = mockDb.findIndex(s => String(s.id) === String(id));
        if (index > -1) mockDb.splice(index, 1);
        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    await page.goto('/sports');
  });

  test('debe mostrar la lista de deportes cargada desde el network interceptado', async ({ page }) => {
    await expect(page.getByText('Fútbol')).toBeVisible();
    await expect(page.getByText('El deporte más popular del mundo')).toBeVisible();
  });

  test('debe abrir el modal de creación y crear un nuevo deporte', async ({ page }) => {
    await page.locator('button:has-text("Crear Deporte")').click();
    await expect(page.getByText('Crear Nuevo Deporte')).toBeVisible();

    await page.getByPlaceholder('Ej. Fútbol').fill('Natación');
    await page.getByPlaceholder('Ej. El rey de los deportes').fill('Deporte acuático');
    await page.locator('input[type="number"]').first().fill('15');

    await page.getByRole('button', { name: 'Crear' }).click();

    await expect(page.getByRole('button', { name: 'Crear' })).toBeHidden();
    await expect(page.getByText('Natación')).toBeVisible();
    await expect(page.getByText('Deporte acuático')).toBeVisible();
  });

  test('debe abrir el modal de edición y actualizar la descripción', async ({ page }) => {
    await page.getByRole('button', { name: /Editar deporte/i }).click();
    await expect(page.getByText('Editar Deporte')).toBeVisible();

    await page.getByPlaceholder('Ej. El rey de los deportes').fill('Descripción actualizada');

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
    await expect(page.getByText('Descripción actualizada')).toBeVisible();
  });

  test('debe eliminar el deporte tras aceptar la confirmación', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());

    await expect(page.getByText('Fútbol')).toBeVisible();

    await page.getByRole('button', { name: /Eliminar deporte/i }).click();

    await expect(page.getByText('No hay deportes registrados.')).toBeVisible();
    await expect(page.getByText('Fútbol')).toBeHidden();
  });
});
