<script setup lang="ts">
import type { NotificationType } from '../../domain/entities/notification-preferences'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ALL_NOTIFICATION_TYPES } from '../../domain/entities/notification-preferences'
import { useNotificationCapability } from '../composables/use-notification-capability'
import { useNotificationsStore } from '../stores/notifications-store'

const { t } = useI18n({ useScope: 'global' })
const notificationsStore = useNotificationsStore()
const { prefs, pushPermission, isLoading } = storeToRefs(notificationsStore)
const { pushSupported, requiresPwaInstall } = useNotificationCapability()

const allOff = computed(() => prefs.value !== null && !prefs.value.notifPushEnabled && !prefs.value.notifEmailEnabled)

const pushDenied = computed(() => pushPermission.value === 'denied')

function isTypeMuted(type: NotificationType): boolean {
  return prefs.value?.notifMutedTypes.includes(type) ?? false
}

function handlePushToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  notificationsStore.setPushEnabled(enabled)
}

function handleEmailToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  notificationsStore.setEmailEnabled(enabled)
}

function handleTypeToggle(type: NotificationType, event: Event) {
  const muted = !(event.target as HTMLInputElement).checked
  notificationsStore.setTypeMuted(type, muted)
}

onMounted(() => {
  notificationsStore.loadPrefs()
})
</script>

<template>
  <div class="notifications-section">
    <h3 class="section-title">
      {{ t('notifications.sectionTitle') }}
    </h3>

    <div v-if="isLoading" class="loading-placeholder" />

    <template v-else-if="prefs">
      <!-- Push channel -->
      <div class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-label">{{ t('notifications.pushLabel') }}</span>
          <span class="toggle-description">{{ t('notifications.pushDescription') }}</span>
        </div>

        <template v-if="requiresPwaInstall">
          <span class="hint-text">{{ t('notifications.installHint') }}</span>
        </template>
        <template v-else-if="pushDenied">
          <span class="hint-text hint-text--warning">{{ t('notifications.deniedHint') }}</span>
        </template>
        <template v-else-if="pushSupported">
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="prefs.notifPushEnabled"
              @change="handlePushToggle"
            >
            <span class="slider" />
          </label>
        </template>
      </div>

      <!-- Email channel -->
      <div class="toggle-row">
        <div class="toggle-info">
          <span class="toggle-label">{{ t('notifications.emailLabel') }}</span>
          <span class="toggle-description">{{ t('notifications.emailDescription') }}</span>
        </div>
        <label class="toggle-switch">
          <input
            type="checkbox"
            :checked="prefs.notifEmailEnabled"
            @change="handleEmailToggle"
          >
          <span class="slider" />
        </label>
      </div>

      <!-- Per-type mute switches — iterates NotificationType union, auto-expands as types are added -->
      <div class="types-section">
        <span class="types-label">{{ t('notifications.typesLabel') }}</span>
        <div
          v-for="type in ALL_NOTIFICATION_TYPES"
          :key="type"
          class="toggle-row toggle-row--indent"
        >
          <span class="toggle-label">{{ t(`notifications.type.${type}`) }}</span>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="!isTypeMuted(type)"
              @change="handleTypeToggle(type, $event)"
            >
            <span class="slider" />
          </label>
        </div>
      </div>

      <!-- All-off disclaimer -->
      <div v-if="allOff" class="disclaimer">
        <span class="material-symbols-outlined disclaimer-icon">warning</span>
        <p class="disclaimer-text">
          {{ t('notifications.allOffDisclaimer') }}
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.notifications-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.toggle-row--indent {
  padding-left: var(--spacing-md);
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-label {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-on-surface);
}

.toggle-description {
  font-size: var(--font-size-sm);
  color: var(--color-on-surface-variant);
}

.types-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.types-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-on-surface-variant);
}

.hint-text {
  font-size: var(--font-size-sm);
  color: var(--color-on-surface-variant);
  max-width: 180px;
  text-align: right;
}

.hint-text--warning {
  color: var(--color-error);
}

.disclaimer {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: var(--color-error-container, #fef2f2);
  border-radius: var(--radius-sm);
}

.disclaimer-icon {
  font-size: 20px;
  color: var(--color-error);
  flex-shrink: 0;
  margin-top: 2px;
}

.disclaimer-text {
  font-size: var(--font-size-sm);
  color: var(--color-on-surface);
}

.loading-placeholder {
  height: 120px;
  border-radius: var(--radius-sm);
  background-color: var(--color-surface-variant);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background-color: var(--color-outline-variant);
  border-radius: 24px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

input:checked + .slider {
  background-color: var(--color-primary);
}

input:checked + .slider::before {
  transform: translateX(20px);
}
</style>
