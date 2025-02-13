<template>
  <v-list
    three-line
    subheader
    style="background: transparent; width: 100%"
  >
    <v-list-item>
      <v-layout
        row
        class="gap-4 max-w-full"
      >
        <v-flex d-flex>
          <v-select
            v-model="content.java"
            outlined
            class="java-select"
            :label="$t('java.location')"
            :placeholder="$t('java.allocatedLong')"
            :items="javaItems"
            :menu-props="{ auto: true, overflowY: true }"
            hide-details
            required
          />
        </v-flex>
        <v-flex
          d-flex
          xs2
        >
          <v-text-field
            v-model="content.minMemory"
            outlined
            hide-details
            type="number"
            :label="$t('java.minMemory')"
            :placeholder="$t('java.allocatedShort')"
            required
          />
        </v-flex>
        <v-flex
          d-flex
          xs2
        >
          <v-text-field
            v-model="content.maxMemory"
            outlined
            hide-details
            type="number"
            :label="$t('java.maxMemory')"
            :placeholder="$t('java.allocatedShort')"
            required
          />
        </v-flex>
      </v-layout>
    </v-list-item>
    <v-list-item v-if="showMinecraft">
      <v-list-item-action class="self-center">
        <img
          :src="minecraftPng"
          width="40"
        >
        <!-- <v-checkbox /> -->
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>
          {{
            $t('minecraftVersion.name')
          }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{
            $t('instance.versionHint')
          }}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action>
        <version-menu
          :is-clearable="false"
          :items="minecraftItems"
          :has-snapshot="true"
          :snapshot.sync="showAlpha"
          :snapshot-tooltip="t('fabricVersion.showSnapshot')"
          :refreshing="refreshingMinecraft"
          @select="onSelectMinecraft"
        >
          <template #default="{ on }">
            <v-text-field
              v-model="content.runtime.minecraft"
              outlined
              append-icon="arrow_drop_down"
              persistent-hint
              hide-details
              :readonly="true"
              @click:append="on.click($event);"
              @click="refreshMinecraft()"
              v-on="on"
            />
          </template>
        </version-menu>
      </v-list-item-action>
    </v-list-item>
    <v-list-item>
      <v-list-item-action class="self-center">
        <img
          :src="forgePng"
          width="40"
        >
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>
          {{
            $t('forgeVersion.name')
          }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{
            $t('instance.versionHint')
          }}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action>
        <version-menu
          :is-clearable="true"
          :items="forgeItems"
          :clear-text="t('forgeVersion.disable')"
          :has-snapshot="true"
          :snapshot.sync="canShowBuggy"
          :snapshot-tooltip="t('fabricVersion.showSnapshot')"
          :refreshing="refreshingForge"
          @select="onSelectForge"
        >
          <template #default="{ on }">
            <v-text-field
              :value="content.runtime.forge"
              outlined
              append-icon="arrow_drop_down"
              hide-details
              persistent-hint
              :readonly="true"
              @click:append="on.click($event);"
              @click="refreshForge()"
              v-on="on"
            />
          </template>
        </version-menu>
      </v-list-item-action>
    </v-list-item>
    <v-list-item>
      <v-list-item-action class="self-center">
        <img
          :src="fabricPng"
          width="40"
        >
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>Fabric</v-list-item-title>
        <v-list-item-subtitle>
          {{
            $t('instance.versionHint')
          }}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action>
        <version-menu
          :is-clearable="true"
          :items="fabricItems"
          :clear-text="t('fabricVersion.disable')"
          :has-snapshot="true"
          :snapshot.sync="showStableOnly"
          :snapshot-tooltip="t('fabricVersion.showSnapshot')"
          :refreshing="refreshingFabric"
          @select="onSelectFabric"
        >
          <template #default="{ on }">
            <v-text-field
              :value="content.runtime.fabricLoader"
              outlined
              hide-details
              append-icon="arrow_drop_down"
              persistent-hint
              :readonly="true"
              @click:append="on.click($event);"
              @click="refreshFabric()"
              v-on="on"
            />
          </template>
        </version-menu>
      </v-list-item-action>
    </v-list-item>
    <v-list-item>
      <v-list-item-action class="self-center">
        <quilt-icon style="width: 40px" />
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>Quilt</v-list-item-title>
        <v-list-item-subtitle>
          {{
            $t('instance.versionHint')
          }}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action>
        <version-menu
          :is-clearable="true"
          :items="quiltItems"
          :clear-text="t('quiltVersion.disable')"
          :refreshing="refreshingQuilt"
          @select="onSelectQuilt"
        >
          <template #default="{ on }">
            <v-text-field
              :value="content.runtime.quiltLoader"
              outlined
              hide-details
              append-icon="arrow_drop_down"
              persistent-hint
              :readonly="true"
              @click:append="on.click($event);"
              @click="refreshQuilt()"
              v-on="on"
            />
          </template>
        </version-menu>
      </v-list-item-action>
    </v-list-item>
  </v-list>
</template>

<script lang=ts setup>
import forgePng from '/@/assets/forge.png'
import minecraftPng from '/@/assets/minecraft.png'
import fabricPng from '/@/assets/fabric.png'
import { CreateOptionKey } from '../composables/instanceCreation'
import { useJava } from '../composables/java'
import { injection } from '/@/util/inject'
import VersionMenu from './VersionMenu.vue'
import { useFabricVersionList, useForgeVersionList, useMinecraftVersionList, useQuiltVersionList } from '../composables/versionList'
import { useI18n } from '/@/composables'
import QuiltIcon from '/@/components/QuiltIcon.vue'

defineProps({
  valid: {
    type: Boolean,
    required: true,
  },
  showMinecraft: {
    type: Boolean,
    default: true,
  },
})

const content = injection(CreateOptionKey)
const minecraft = computed(() => content.runtime.minecraft)
const { t } = useI18n()
const { items: minecraftItems, showAlpha, refresh: refreshMinecraft, refreshing: refreshingMinecraft, release } = useMinecraftVersionList(minecraft)
const { items: forgeItems, canShowBuggy, recommendedOnly, refresh: refreshForge, refreshing: refreshingForge } = useForgeVersionList(minecraft, computed(() => content.runtime.forge ?? ''))
const { items: fabricItems, showStableOnly, refresh: refreshFabric, refreshing: refreshingFabric } = useFabricVersionList(minecraft, computed(() => content.runtime.fabricLoader ?? ''))
const { items: quiltItems, refresh: refreshQuilt, refreshing: refreshingQuilt } = useQuiltVersionList(minecraft, computed(() => content.runtime.quiltLoader ?? ''))

recommendedOnly.value = false
onMounted(() => {
  refreshMinecraft().then(() => {
    if (!content.runtime.minecraft) {
      content.runtime.minecraft = release.value?.id ?? ''
    }
  })
})

const { all: javas } = useJava()
const javaItems = computed(() => javas.value.map(java => ({
  text: `Java ${java.majorVersion} (${java.version})`,
  value: java.path,
})))

function onSelectForge(version: string) {
  if (content?.runtime) {
    const runtime = content.runtime
    runtime.forge = version
    if (version) {
      runtime.fabricLoader = ''
      runtime.quiltLoader = ''
    }
  }
}
function onSelectFabric(version: string) {
  if (content?.runtime) {
    const runtime = content.runtime
    if (version) {
      runtime.forge = ''
      runtime.quiltLoader = ''
    }
    runtime.fabricLoader = version
  }
}
function onSelectQuilt(version: string) {
  if (content.runtime) {
    const runtime = content.runtime
    if (version) {
      runtime.forge = runtime.fabricLoader = ''
      runtime.quiltLoader = version
    }
  }
}
function onSelectMinecraft(version: string) {
  if (content?.runtime) {
    const runtime = content.runtime
    runtime.minecraft = version
    runtime.forge = ''
    runtime.fabricLoader = ''
  }
}
</script>

<style>
.java-select .v-select__selection {
  white-space: nowrap;
  overflow-x: hidden;
  overflow-y: hidden;

  max-width: 240px;
}
</style>
