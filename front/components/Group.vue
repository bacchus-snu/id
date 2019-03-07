<template>
  <div>
    <h1 class="groupAdministration">{{ groupAdministrationTrans[lang] }}</h1>
    <el-row>
      <el-col :md="{span: 16, offset: 4}" :sm="{span: 24, offset: 0}" :xs="{span: 24, offset: 0}">
        <el-table :data="groupList" height="540" style="width: 100%">
          <el-table-column type="index" width="50"></el-table-column>
          <el-table-column
            prop="name"
            :label="attributeGroupTrans[lang]"
            width="180"
            align="center"
          >
            <template slot-scope="slotProps">{{ slotProps.row.name[lang] }}</template>
          </el-table-column>
          <el-table-column :label="attributeStatusTrans[lang]" width="180" align="center">
            <template slot-scope="slotProps">
              <el-button
                v-if="slotProps.row.isPending"
                disabled
                size="mini"
                @click="applyGroup(slotProps.row.idx)"
              >{{ pendingTrans[lang] }}</el-button>
              <el-button
                v-else-if="slotProps.row.isDirectMember"
                size="mini"
                type="danger"
                @click="checkLeaveGroup(slotProps.row.idx)"
              >{{ leaveTrans[lang] }}</el-button>
              <el-tooltip
                v-else-if="slotProps.row.isMember"
                effect="dark"
                :content="groupLeaveTooltipTrans[lang]"
                placement="top"
              >
                <el-button disabled size="mini" type="danger">{{ leaveTrans[lang] }}</el-button>
              </el-tooltip>
              <el-button
                v-else
                size="mini"
                @click="applyGroup(slotProps.row.idx)"
              >{{ applyTrans[lang] }}</el-button>
            </template>
          </el-table-column>
          <el-table-column :label="attributeOwnershipTrans[lang]" width="180" align="center">
            <template slot-scope="slotProps">
              <el-button
                v-if="slotProps.row.isOwner"
                size="mini"
                @click="groupOwnership(slotProps.row.idx)"
              >{{ manageTrans[lang] }}</el-button>
              <el-button
                v-else
                size="mini"
                disabled
                @click="groupOwnership(slotProps.row.idx)"
              >{{ manageTrans[lang] }}</el-button>
            </template>
          </el-table-column>
          <el-table-column
            prop="description"
            :label="attributeDescriptionTrans[lang]"
            min-width="180"
            align="center"
          >
            <template slot-scope="slotProps">{{ slotProps.row.description[lang] }}</template>
          </el-table-column>
        </el-table>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Provide } from "nuxt-property-decorator";
import axios from "axios";
import { Translation, Language } from "../types/translation";

@Component({})
export default class Group extends Vue {
  private groupList;

  private readonly groupAdministrationTrans: Translation = {
    ko: "그룹관리",
    en: "Group Administration"
  };

  private readonly attributeGroupTrans: Translation = {
    ko: "그룹명",
    en: "Group Name"
  };

  private readonly attributeStatusTrans: Translation = {
    ko: "상태",
    en: "status"
  };

  private readonly attributeOwnershipTrans: Translation = {
    ko: "관리자 페이지",
    en: "Admin Page"
  };

  private readonly attributeDescriptionTrans: Translation = {
    ko: "설명",
    en: "Description"
  };

  private readonly warningTrans: Translation = {
    ko: "주의",
    en: "Warning"
  };

  private readonly leaveCheckTrans: Translation = {
    ko: "탈퇴하시겠습니까?",
    en: "This will leave the group. Continue?"
  };

  private readonly applyFailedTrans: Translation = {
    ko: "신청에 실패했습니다.",
    en: "Apply failed."
  };

  private readonly leaveFailedTrans: Translation = {
    ko: "탈퇴에 실패했습니다.",
    en: "Leave failed"
  };

  private readonly applyTrans: Translation = {
    ko: "신청",
    en: "Apply"
  };

  private readonly leaveTrans: Translation = {
    ko: "탈퇴",
    en: "Leave"
  };

  private readonly pendingTrans: Translation = {
    ko: "승인 대기",
    en: "Pending"
  };

  private readonly manageTrans: Translation = {
    ko: "관리",
    en: "Manage"
  };

  private readonly groupLeaveTooltipTrans: Translation = {
    ko: "이 그룹의 하위 그룹에 소속된 상태이므로 탈퇴할 수 없습니다.",
    en: "You cannot leave a group as you belong to one of its descendents."
  };

  get lang(): Language {
    return this.$store.state.language;
  }

  private async mounted() {
    const response = await axios.get("/api/check-login", {
      validateStatus: () => true
    });

    if (response.status !== 200) {
      this.$router.push("/");
    }

    const groupResponse = await axios.get("/api/group", {
      validateStatus: () => true
    });

    this.groupList = groupResponse.data;
  }

  private async applyGroup(idx: number) {
    const response = await axios.post("/api/group/" + idx + "/apply");
    if (response.status === 200) {
      this.$router.go(0);
    } else {
      this.$notify.error(this.applyFailedTrans[this.lang]);
    }
  }

  private async checkLeaveGroup(idx: number) {
    this.$confirm(
      this.leaveCheckTrans[this.lang],
      this.warningTrans[this.lang],
      {
        confirmButtonText: "OK",
        cancelButtonText: "Cancel",
        type: "warning"
      }
    ).then(() => {
      this.leavegroup(idx);
    });
  }

  private async leavegroup(idx: number) {
    const response = await axios.post("/api/group/" + idx + "/leave");
    if (response.status === 200) {
      this.$router.go(0);
    } else {
      this.$notify.error(this.leaveFailedTrans[this.lang]);
    }
  }

  private async groupOwnership(idx: number) {
    this.$router.push("/group/" + idx);
  }

  data() {
    return {
      groupList: this.groupList
    };
  }
}
</script>

<style scoped>
.groupAdministration {
  font-size: 32px;
  font-weight: 500;
  line-height: 40px;
  text-align: center;
  margin-top: 4%;
}
</style>
