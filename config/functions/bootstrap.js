const fs = require("fs");
const {
  pages,
  globals,
  leadFormSubmissions,
} = require("../../data/data.js");

async function isFirstRun() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: "type",
    name: "setup",
  });
  const initHasRun = await pluginStore.get({ key: "initHasRun" });
  await pluginStore.set({ key: "initHasRun", value: true });
  return !initHasRun;
}

async function setPublicPermissions(newPermissions) {
  // Find the ID of the public role
  const publicRole = await strapi
    .query("role", "users-permissions")
    .findOne({ type: "public" });

  // List all available permissions
  const publicPermissions = await strapi
    .query("permission", "users-permissions")
    .find({ type: "application", role: publicRole.id });

  // Update permission to match new config
  const controllersToUpdate = Object.keys(newPermissions);
  const updatePromises = publicPermissions
    .filter((permission) => {
      // Only update permissions included in newConfig
      if (!controllersToUpdate.includes(permission.controller)) {
        return false;
      }
      if (!newPermissions[permission.controller].includes(permission.action)) {
        return false;
      }
      return true;
    })
    .map((permission) => {
      // Enable the selected permissions
      return strapi
        .query("permission", "users-permissions")
        .update({ id: permission.id }, { enabled: true });
    });

  await Promise.all(updatePromises);
}

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats["size"];
  return fileSizeInBytes;
}

function getFileData(fileName) {
  const filePath = `./data/uploads/${fileName}`;

  // Parse the file metadata
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split(".").pop();
  const mimeType = `image/${ext === "svg" ? "svg+xml" : ext}`;

  return {
    path: filePath,
    name: fileName,
    size,
    type: mimeType,
  };
}

// Create an entry and attach files if there are any
async function createEntry(model, entry, files) {
  try {
    const createdEntry = await strapi.query(model).create(entry);
    if (files) {
      await strapi.entityService.uploadFiles(createdEntry, files, {
        model,
      });
      const uploads = await strapi.query("file", "upload").find();
      const uploadsWithInfo = uploads.map((upload) => {
        const [alternativeText] = upload.name.split(".");
        return strapi.plugins.upload.services.upload.updateFileInfo(upload.id, {
          alternativeText,
        });
      });
      await Promise.all(uploadsWithInfo);
    }
  } catch (e) {
    console.log(e);
  }
}

async function importPages(pages) {
  const getPageCover = (slug) => {
    switch (slug) {
      case "":
        return getFileData("undraw-content-team.png");
      default:
        return null;
    }
  };

  return pages.map(async (page) => {
    const files = {};
    const shareImage = getPageCover(page.slug);
    if (shareImage) {
      files["metadata.shareImage"] = shareImage;
    }
    // Check if dynamic zone has attached files
    page.contentSections.forEach((section, index) => {
      if (section.__component === "sections.hero") {
        files[`contentSections.${index}.picture`] = getFileData(
          "undraw-content-team.svg"
        );
      } else if (section.__component === "sections.feature-rows-group") {
        const getFeatureMedia = (featureIndex) => {
          switch (featureIndex) {
            case 0:
              return getFileData("undraw-design-page.svg");
            case 1:
              return getFileData("undraw-create-page.svg");
            default:
              return null;
          }
        };
        section.features.forEach((feature, featureIndex) => {
          files[
            `contentSections.${index}.features.${featureIndex}.media`
          ] = getFeatureMedia(featureIndex);
        });
      } else if (section.__component === "sections.feature-columns-group") {
        const getFeatureMedia = (featureIndex) => {
          switch (featureIndex) {
            case 0:
              return getFileData("preview.svg");
            case 1:
              return getFileData("devices.svg");
            case 2:
              return getFileData("palette.svg");
            default:
              return null;
          }
        };
        section.features.forEach((feature, featureIndex) => {
          files[
            `contentSections.${index}.features.${featureIndex}.icon`
          ] = getFeatureMedia(featureIndex);
        });
      } else if (section.__component === "sections.testimonials-group") {
        section.logos.forEach((logo, logoIndex) => {
          files[
            `contentSections.${index}.logos.${logoIndex}.logo`
          ] = getFileData("logo.png");
        });
        section.testimonials.forEach((testimonial, testimonialIndex) => {
          files[
            `contentSections.${index}.testimonials.${testimonialIndex}.logo`
          ] = getFileData("logo.png");
          files[
            `contentSections.${index}.testimonials.${testimonialIndex}.picture`
          ] = getFileData("user.png");
        });
      }
    });

    await createEntry("page", page, files);
  });
}

async function importGlobal() {
  // Add images
  const files = {
    favicon: getFileData("favicon.png"),
    "metadata.shareImage": getFileData("undraw-content-team.png"),
    "navbar.logo": getFileData("logo.png"),
    "footer.logo": getFileData("logo.png"),
  };

  // Create entry
  globals.forEach(async (locale) => {
    await createEntry("global", locale, files);
  })
}

async function importLeadFormSubmissionData() {
  leadFormSubmissions.forEach(async (submission) => {
    await createEntry("lead-form-submissions", submission);
  });
}

async function importSeedData() {
  // Allow read of application content types
  await setPublicPermissions({
    global: ["find"],
    page: ["find", "findone"],
    "lead-form-submissions": ["create"],
  });


  await strapi.query("locale", "i18n").create({
    name: "French (fr)",
    code: "fr",
  });


  // Create all entries
  await importGlobal();
  await importPages(pages);
  await importLeadFormSubmissionData();
}

const languages = [
  {
    name: '??????',
    name_cn: '????????????',
    name_en: 'Chinese Simplified',
    name_hk: '????????????',
    code: 'cn'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'English',
    name_hk: '??????',
    code: 'en'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Chinese Traditional',
    name_hk: '??????',
    code: 'hk'
  }
];

const tags = [
  {
    name: '?????????',
    name_cn: '?????????',
    name_en: 'Slide',
    name_hk: '?????????',
    code: 'slide'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Hot',
    name_hk: '??????',
    code: 'hot'
  }
];

const contentTypes = [{
  name: '??????',
  name_cn: '??????',
  name_en: 'List',
  name_hk: '??????',
  code: 'list'
}, {
  name: '??????',
  name_cn: '??????',
  name_en: 'Index',
  name_hk: '??????',
  code: 'index'
}];

const channels = [
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Image',
    name_hk: '??????',
    code: 'image'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Article',
    name_hk: '??????',
    code: 'article'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Software',
    name_hk: '??????',
    code: 'soft'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'File',
    name_hk: '??????',
    code: 'file'
  }
];

const templates = [
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Article',
    name_hk: '??????',
    code: 'article'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Software',
    name_hk: '??????',
    code: 'soft'
  },
  {
    name: '??????',
    name_cn: '??????',
    name_en: 'Image',
    name_hk: '??????',
    code: 'image'
  }
];

const config = {
  name: '????????????'
}

const createLanguage = async language => {
  await strapi.query('language', '').create(language)
}

const createLanguages = async () => {
  for (const language of languages) {
    await createLanguage(language)
  }
}

const createContentTypes = () => {
  contentTypes.forEach(contentType => {
    strapi.query('content-type', '').create(contentType)
  })
}

const createTags = () => {
  tags.forEach(tag => {
    strapi.query('tag', '').create(tag)
  })
}

const createChannels = () => {
  channels.forEach(channel => {
    strapi.query('channel', '').create(channel)
  })
}

const createTemplates = () => {
  templates.forEach(template => {
    strapi.query('template', '').create(template)
  })
}

const createConfig = (language) => {
  config.language = language;
  strapi.query('config', '').create(config)
}

module.exports = async () => {
  const shouldImportSeedData = await isFirstRun();
  if (shouldImportSeedData) {
    try {
      await importSeedData();
    } catch (error) {
      console.log("Could not import seed data");
      console.error(error);
    }
  }

  return new Promise(resolve => {
    strapi.query('config', '').find().then(res => {
      if (res.length === 0) {
      }
    });
    strapi.query('language', '').find().then(res => {
      if (res.length === 0) {
        createLanguages().then(() => {

        });
      }
    });
    strapi.query('content-type', '').find().then(res => {
      if (res.length === 0) {
        createContentTypes();
      }
    });
    strapi.query('tag', '').find().then(res => {
      if (res.length === 0) {
        createTags();
      }
    });
    strapi.query('channel', '').find().then(res => {
      if (res.length === 0) {
        createChannels();
      }
    });
    strapi.query('template', '').find().then(res => {
      if (res.length === 0) {
        createTemplates();
      }
    });
    strapi.query('config', '').find().then(res => {
      if (res.length === 0) {
        strapi.query('language', '').find({code: 'cn'}).then(language => {
          createConfig(language);
        })
      }
    });
    resolve(true)
  });
};
