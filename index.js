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
    let href = this.request.httpRequest.endpoint.href;
    let photoKey = "";
    let i = 0;
    var photos = data.Contents.reduce((acc, photo) => {
      photoKey = photo.Key;
      const imageRequest = JSON.stringify({
        bucket: albumBucketName,
        key: photoKey,
        edits: {
          resize: { width: 380 },
        },
      });
      i++;
      const photoUrl = cloudfrontBaseUrl + btoa(imageRequest);
      return (acc += `<figure><img src="${photoUrl}" class="img" /><figcaption>${photoKey}</figcaption></figure>`);
    }, "");

    const message = photos.length
      ? `<p>The following photos are present.</p>`
      : `<p>There are no photos in this album.</p>`;
    var htmlTemplate = `
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
    // document.getElementsByTagName("img")[0].setAttribute("style", "display:none;");
  });
}

// List the photo albums that exist in the bucket.
function listAlbums() {
  s3.listObjects({ Delimiter: "/" }, function (err, data) {
    if (err) {
      return alert("There was an error listing your albums: " + err.message);
    } else {
      const albumsItems = data.CommonPrefixes.reduce((acc, commonPrefix) => {
        const prefix = commonPrefix.Prefix;
        const albumName = decodeURIComponent(prefix.replace("/", ""));
        return (acc += `<li>
            <button class="album" style="margin:5px;" data-albumname="${albumName}">
                ${albumName}
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

listAlbums();

// TODO: this works, but it needs to be called after the image has been rendered on the page. this will be tuff in the current implementation
// function getExif() {
//     console.log('getExif')
//     var images = document.getElementsByTagName("img");
//     Array.prototype.forEach.call(images, function(image) {
//         EXIF.getData(image, function() {
//             var allMetaData = EXIF.getAllTags(this);
//             var allMetaDataSpan = document.querySelector("#allMetaDataSpan");
//             allMetaDataSpan.innerHTML = JSON.stringify(allMetaData, null, "\t");
//         });
//     });
//
// }
