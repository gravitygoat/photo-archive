import "./css/styles.css";

const albumBucketName = process.env.BUCKET_NAME;
const cloudfrontBaseUrl = process.env.CLOUD_FRONT_BUCKET_URL;
const identityPoolId = process.env.IDENTITY_POOL_ID;
const awsRegion = process.env.AWS_REGION;

// DOM Elements
const photosContainerEl = document.querySelector("#photos");

// Initialize the Amazon Cognito credentials provider
AWS.config.region = awsRegion; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: identityPoolId,
});

// Create a new service object
const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: albumBucketName },
});

// Delegated events
photosContainerEl.addEventListener("click", (event) => {
  if (event.target.className === "backtoalbums") {
    listAlbums();
  }
  if (event.target.className === "pagebutton") {
    viewAlbum(event.target.dataset.albumname, event.target.dataset.pagetag, event.target.dataset.prevtag);
  }
  if (event.target.className === "album") {
    viewAlbum(event.target.dataset.albumname);
  }
});

// Show the photos that exist in an album.
function viewAlbum(albumName, startAfter = `${albumName}/jpg/`, prevTag = "") {
  const albumPhotosKey = albumName + "/";
  s3.listObjectsV2({ Prefix: `${albumPhotosKey}jpg/`, StartAfter: startAfter, MaxKeys: 30 }, function (err, data) {
    if (err) {
      return alert("There was an error viewing your album: " + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    let photoKey = ""; // TODO: refactor this stuff
    const photos = data.Contents.reduce((acc, photo) => {
      photoKey = photo.Key;

      const image = new Image(photoKey, photoKey, albumBucketName);
      return (acc += `<figure><img src="${image.thumbnail}" class="img" /><figcaption>${image.title}</figcaption></figure>`);
    }, "");

    const message = photos.length
      ? `<p>The following photos are present.</p>`
      : `<p>There are no photos in this album.</p>`;

    const htmlTemplate = `
        <div>
            <button class="backtoalbums">Back To Albums</button>
        </div>
        <h2>
            Album: ${albumName}
        </h2>
            ${message}
        <div class="photo-grid">
            ${photos}
        </div>
        <h2>
            End of Album: ${albumName}
        </h2>
        <div>
          <button class="backtoalbums">Back To Albums</button>
          <button class="pagebutton" data-albumname="${albumName}" data-pagetag="${prevTag}">prev set</button>
          <button class="pagebutton" data-albumname="${albumName}" data-pagetag="${photoKey}" data-prevtag="${data.Contents[0].Key}">next set</button>
        </div>`;
    photosContainerEl.innerHTML = htmlTemplate;
  });
}

// List the photo albums that exist in the bucket.
function listAlbums() {
  s3.listObjects({ Delimiter: "/" }, function (err, data) {
    if (err) {
      return alert("There was an error listing your albums: " + err.message);
    } else {
      const albumsItems = data.CommonPrefixes.reduce((acc, commonPrefix) => {
        const album = new Album(commonPrefix.Prefix, commonPrefix.Prefix);
        return (acc += `<li>
            <button class="album" style="margin:5px;" data-albumname="${album.albumName}">
                ${album.albumName}
            </button>
          </li>`);
      }, "");

      const message = albumsItems.length
        ? `<p>Click on an album name to view it.</p>`
        : `<p>You do not have any albums. Please Create album.`;

      const htmlTemplate = `<h2>Albums</h2>${message}<ul>${albumsItems}</ul>`;
      photosContainerEl.innerHTML = htmlTemplate;
    }
  });
}

class Album {
  constructor(title, albumName) {
    this.title = title;
    this.albumName = this.getAlbumName(albumName);
  }

  getAlbumName(albumName) {
    return decodeURIComponent(albumName.replace("/", ""));
  }
}

class Image {
  constructor(title, key, albumname) {
    this.title = title;
    this.key = key;
    this.albumname = albumname;
    this.thumbnail = this.getScaledImage(380);
    this.fullImage = this.getScaledImage(600);
  }

  getScaledImage(width) {
    const imageRequest = JSON.stringify({
      bucket: this.albumname,
      key: this.key,
      edits: {
        resize: { width: width },
      },
    });

    return cloudfrontBaseUrl + btoa(imageRequest);
  }
}

listAlbums();
