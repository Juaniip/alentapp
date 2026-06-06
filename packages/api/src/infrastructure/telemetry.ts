import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';

const prometheusExporter = new PrometheusExporter({
    port: 9464,
    endpoint: '/metrics',
});

const sdk = new NodeSDK({
    metricReader: prometheusExporter,
    instrumentations: [
        getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': { enabled: true },
            '@opentelemetry/instrumentation-fastify': { enabled: true },
        }),
    ],
});

sdk.start();

const meter = metrics.getMeter('alentapp-api');

export const redMetrics = {
    requestCounter: meter.createCounter('http.requests.total', {
        description: 'Total de requests HTTP recibidas',
    }),
    errorCounter: meter.createCounter('http.requests.errors', {
        description: 'Total de requests con error (4xx/5xx)',
    }),
    requestDuration: meter.createHistogram('http.request.duration', {
        description: 'Duración de requests en milisegundos',
        unit: 'ms',
    }),
    activeRequests: meter.createUpDownCounter('http.requests.active', {
        description: 'Requests siendo procesadas concurrentemente',
    }),
};

// ObservableGauge: se evalúa en cada scrape de Prometheus
const memoryGauge = meter.createObservableGauge('process.memory.usage', {
    description: 'Memoria RSS del proceso Node.js',
    unit: 'bytes',
});

memoryGauge.addCallback((result) => {
    result.observe(process.memoryUsage().rss);
});

export { sdk };
