<template>
  <div>
    <change-password></change-password>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import ChangePassword from '~/components/ChangePassword'

@Component({
  components: {
    'change-password': ChangePassword,
  },
})
export default class SignUpPage extends Vue {

}
</script>
