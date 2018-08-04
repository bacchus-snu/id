<template>
  <div>
    <user-admin-table/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import UserAdminTable from '~/components/UserAdminTable.vue'

@Component({
  components: {
    'user-admin-table': UserAdminTable,
  }
})
export default class extends Vue {

}
</script>
