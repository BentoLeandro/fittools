<template>
  <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-5xl font-bold text-green-500 mb-4">
        🏋️‍♂️ FitTools Brasil
      </h1>
      <p class="text-xl text-gray-400 mb-8">
        Plataforma fitness em desenvolvimento
      </p>
      <div class="space-y-2 text-left bg-gray-800 p-6 rounded-lg">
        <p class="text-green-400">✅ Nuxt 3 configurado</p>
        <p class="text-green-400">✅ Vue 3 + TypeScript</p>
        <p class="text-green-400">✅ Tailwind CSS funcionando</p>
        <p class="text-green-400">✅ Pinia instalado</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'FitTools Brasil - Home',
  meta: [
    { name: 'description', content: 'Plataforma fitness brasileira' }
  ]
})
</script>
