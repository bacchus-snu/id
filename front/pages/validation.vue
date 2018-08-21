<template>
  <div>
    <validate-form></validate-form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'nuxt-property-decorator'
import ValidateForm from '~/components/ValidateForm'

@Component({
  components: {
    'validate-form': ValidateForm,
  },
})
export default class ValidationPage extends Vue {

}
</script>
