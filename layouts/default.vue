<template>
  <div class="site">
    <a class="skip" href="#content">{{ $t('common.skip') }}</a>
    <DemoBanner />
    <AppHeader />
    <main id="content" class="site__main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
