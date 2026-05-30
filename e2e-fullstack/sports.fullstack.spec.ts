import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Deportes.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la BD antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 */

test.describe('Sports Full-Stack E2E', () => {

  test('debe mostrar el estado vacío cuando no hay deportes en la BD', async ({ page }) => {
    await page.goto('/sports');
    await expect(page.getByText('No hay deportes registrados.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear un deporte real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/sports');

    await page.locator('button:has-text("Crear Deporte")').click();
    await expect(page.getByText('Crear Nuevo Deporte')).toBeVisible();

    await page.getByPlaceholder('Ej. Fútbol').fill('Fútbol E2E');
    await page.getByPlaceholder('Ej. El rey de los deportes').fill('Test full-stack E2E');
    await page.locator('input[type="number"]').first().fill('20');

    await page.getByRole('button', { name: 'Crear' }).click();

    await expect(page.getByRole('button', { name: 'Crear' })).toBeHidden();
    await expect(page.getByText('Fútbol E2E')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Test full-stack E2E')).toBeVisible();
  });

  test('debe editar el deporte creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/sports');

    await expect(page.getByText('Fútbol E2E')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Editar deporte/i }).first().click();
    await expect(page.getByText('Editar Deporte')).toBeVisible();

    await page.getByPlaceholder('Ej. El rey de los deportes').fill('Descripción actualizada E2E');

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    await expect(page.getByText('Descripción actualizada E2E')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Test full-stack E2E', { exact: true })).toBeHidden();
  });

  test('debe eliminar el deporte y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/sports');

    await expect(page.getByText('Fútbol E2E')).toBeVisible({ timeout: 10000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /Eliminar deporte/i }).first().click();

    await expect(page.getByText('No hay deportes registrados.')).toBeVisible({ timeout: 10000 });
  });
});
