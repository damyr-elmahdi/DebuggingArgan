import axios from "axios";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getNews,
  createNews,
  updateNews,
  deleteNews,
  publishNews,
  // Removed archiveNews import
} from "../services/newsService";

export default function NewsManagement() {
  const { t } = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNewsId, setCurrentNewsId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_published: false,
    scheduled_for: "",
    image: null,
    // Add this to track if we should keep the existing image
    keep_existing_image: true,
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const data = await getNews();
      setNews(data.data || []);
      setError("");
    } catch (err) {
      setError(t("news.errors.loadFailed"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newsFormData = new FormData();

      // Always include these required fields
      newsFormData.append("title", formData.title);
      newsFormData.append("content", formData.content);

      // Only include is_published for new items, not when editing
      if (!isEditing) {
        newsFormData.append("is_published", formData.is_published ? 1 : 0);
      }

      // Add scheduled publication date if provided and not publishing immediately
      if ((!isEditing || !formData.is_published) && formData.scheduled_for) {
        newsFormData.append("scheduled_for", formData.scheduled_for);
      }

      // Only include image if it exists and we're not keeping the existing one
      if (formData.image && !formData.keep_existing_image) {
        newsFormData.append("image", formData.image);
      }

      if (isEditing) {
        // Use the updated service function instead of direct axios call
        await updateNews(currentNewsId, newsFormData);
      } else {
        await createNews(newsFormData);
      }

      resetForm();
      fetchNews();
    } catch (err) {
      const action = isEditing ? "update" : "create";
      setError(t(`news.errors.${action}Failed`));
      console.error("Submission error:", err);
      if (err.response && err.response.data) {
        console.error("Server error details:", err.response.data);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "file") {
      // Handle file input
      if (files && files[0]) {
        setFormData({
          ...formData,
          [name]: files[0],
          // When user selects a new file, set keep_existing_image to false
          keep_existing_image: false,
        });

        // Create preview URL for the image
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(files[0]);
      }
    } else {
      // Handle other inputs
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      is_published: false,
      scheduled_for: "",
      image: null,
      keep_existing_image: true,
    });
    setImagePreview(null);
    setShowForm(false);
    setIsEditing(false);
    setCurrentNewsId(null);
  };

  const handleEdit = (item) => {
    // Set form to editing mode
    setIsEditing(true);
    setCurrentNewsId(item.id);
    setShowForm(true);

    // Fill form with current news data
    setFormData({
      title: item.title,
      content: item.content,
      is_published: item.is_published,
      scheduled_for: item.scheduled_publication || "",
      image: null, // Can't prefill file input, but we can show preview
      keep_existing_image: true, // Default to keeping existing image
    });

    // Set image preview if exists
    if (item.image_path) {
      setImagePreview(getImageUrl(item.image_path));
    } else {
      setImagePreview(null);
    }

    // Scroll to form
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("news.confirmDelete"))) {
      try {
        await deleteNews(id);
        fetchNews();
      } catch (err) {
        setError(t("news.errors.deleteFailed"));
        console.error(err);
      }
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishNews(id);
      fetchNews();
    } catch (err) {
      setError(t("news.errors.publishFailed"));
      console.error(err);
    }
  };

  // Removed handleArchive function

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    return `${import.meta.env.VITE_API_URL}/storage/${imagePath}`;
  };

  // Function to get the minimum allowed date-time (current time)
  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (loading) {
    return <div className="text-center py-4">{t("news.loading")}</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {t("news.title")}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {t("news.subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm && !isEditing) {
              resetForm();
            } else {
              setShowForm(!showForm);
              if (isEditing) {
                resetForm();
              }
            }
          }}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#18bebc] hover:bg-teal-700"
        >
          {showForm 
            ? (isEditing ? t("news.buttons.cancelEdit") : t("news.buttons.cancel")) 
            : t("news.buttons.create")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="border-t border-gray-200 px-4 py-5">
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("news.form.title")}
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="shadow-sm focus:ring-teal-400 focus:border-teal-400 block w-full h-8 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("news.form.content")}
              </label>
              <textarea
                id="content"
                name="content"
                rows={4}
                value={formData.content}
                onChange={handleInputChange}
                required
                className="shadow-sm focus:ring-teal-400 focus:border-teal-400 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="image"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {isEditing 
                  ? t("news.form.imageWithNote") 
                  : t("news.form.image")}
              </label>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/*"
                onChange={handleInputChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-teal-50 file:text-teal-700
                  hover:file:bg-teal-100"
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt={t("news.form.preview")}
                    className="h-32 w-auto object-cover rounded-md"
                  />
                  {isEditing && !formData.image && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("news.form.imageKeepNotice")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Only show publish immediately checkbox when creating a new item */}
            {!isEditing && (
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="is_published"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#18bebc] focus:ring-teal-400 border-gray-300 rounded"
                />
                <label
                  htmlFor="is_published"
                  className="ml-2 block text-sm text-gray-700"
                >
                  {t("news.form.publishImmediately")}
                </label>
              </div>
            )}

            {/* Scheduled publish time input - show when not publishing immediately */}
            {!formData.is_published && !isEditing && (
              <div className="mb-4">
                <label
                  htmlFor="scheduled_for"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("news.form.scheduleTime")}
                </label>
                <input
                  type="datetime-local"
                  id="scheduled_for"
                  name="scheduled_for"
                  value={formData.scheduled_for}
                  onChange={handleInputChange}
                  min={getMinDateTime()}
                  className="shadow-sm focus:ring-teal-400 focus:border-teal-400 block w-full sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t("news.form.scheduleHint")}
                </p>
              </div>
            )}

            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#18bebc] hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400"
            >
              {isEditing 
                ? t("news.buttons.update") 
                : t("news.buttons.save")}
            </button>
          </form>
        </div>
      )}

      <div className="border-t border-gray-200">
        {news.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("news.table.image")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("news.table.title")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("news.table.date")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("news.table.status")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {t("news.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {news.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.image_path ? (
                        <img
                          src={getImageUrl(item.image_path)}
                          alt={item.title}
                          className="h-12 w-12 object-cover rounded-md"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                          {t("news.noImage")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.published_at
                        ? new Date(item.published_at).toLocaleDateString()
                        : item.scheduled_publication
                        ? t("news.scheduledDate", {
                            date: new Date(item.scheduled_publication).toLocaleString()
                          })
                        : t("news.status.draft")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.is_published ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {t("news.status.published")}
                        </span>
                      ) : item.scheduled_publication ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {t("news.status.scheduled")}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {t("news.status.draft")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {t("news.buttons.edit")}
                      </button>
                      {!item.is_published ? (
                        <button
                          onClick={() => handlePublish(item.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          {t("news.buttons.publishNow")}
                        </button>
                      ) : (
                        // Removed Archive button
                        <></>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t("news.buttons.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-5">
            <p className="text-sm text-gray-500">{t("news.noItems")}</p>
          </div>
        )}
      </div>
    </div>
  );
}