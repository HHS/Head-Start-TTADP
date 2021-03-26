require "active_support/all"
require "logger"
require "smartsheet"
require "faraday"
require "faraday_middleware"
require "faraday-cookie_jar"
require "tempfile"
require_relative "config"

class Attachment

  SMARTHUB_URI_BASE = "https://ttahub.ohs.acf.hhs.gov"

  attr_reader :region, :client, :cookie
  def initialize(region)
    @region = region.to_s
    # session cookies taken out of chrome dev tools for an active admin session
    fail "Session cookie not provided" if ENV["SMARTHUB_SESSION_COOKIE"].blank? || ENV["SMARTHUB_SESSION_SIG"].blank?
    @cookie = "session=#{ENV["SMARTHUB_SESSION_COOKIE"]}; session.sig=#{ENV["SMARTHUB_SESSION_SIG"]}"
    token = ENV["SMARTSHEET_API_TOKEN"]
    fail "No API Token provided" if token.blank?
    logger = Logger.new($stdout)
    logger.level = :warn
    @client = Smartsheet::Client.new(
      token: token,
      logger: logger,
      base_url: Smartsheet::Constants::GOV_API_URL
    )
  end

  def call
    sheet = client.sheets.get(sheet_id: sheet_id, params: {
      include: "attachments,discussions",
      level: "2",
      columnIds: report_id_column_id
    })
    sheet[:rows].each do |row|
      next if row[:discussions].blank? && row[:attachments].blank?
      process_row(row)
    end
    sheet
  end

  def process_row(row)
    legacy_id = row[:cells].first[:value].gsub(/^R14/, "R#{"%02d" % region}")
    puts "Processing #{legacy_id}"
    activity_report = if row[:discussions].present?
      discussions = row[:discussions].flat_map { |disc| retrieve_discussion(disc[:id]) }.join("\n")
      update_comments legacy_id, discussions
    else
      activity_report legacy_id
    end
    (row[:attachments] || []).each do |attachment|
      process_attachment activity_report, attachment
    end
  end

  def process_attachment(activity_report, attachment_meta)
    if activity_report["attachments"].none? { |attach| attach["originalFileName"] == attachment_meta[:name] }
      attach = client.sheets.attachments.get(sheet_id: sheet_id, attachment_id: attachment_meta[:id])
      if attach[:url].blank?
        fail "No URL to download file: #{attach.inspect}"
      end
      Tempfile.create do |file|
        success = download_file(file, attach[:url])
        if success
          post_file(activity_report["id"], file, attachment_meta)
        else
          puts "Failed to download file for: #{activity_report["displayId"]}, #{attach.inspect}"
        end
      end
    end
  end

  def update_comments(legacy_id, discussions)
    response = put("/api/activity-reports/legacy/#{legacy_id}", {comments: discussions})
    if response.success?
      JSON.parse(response.body)
    else
      fail "#{response.status} #{response.body}"
    end
  end

  def activity_report(legacy_id)
    response = get("/api/activity-reports/legacy/#{legacy_id}")
    if response.success?
      JSON.parse(response.body)
    else
      fail "#{response.status} #{response.body}"
    end
  end

  def download_file(file, url)
    conn = Faraday.new(url) do |c|
      c.use FaradayMiddleware::FollowRedirects
      c.use :cookie_jar
    end
    response = conn.get
    if response.success?
      file.write(response.body)
      file.flush
      true
    else
      false
    end
  end

  def post_file(report_id, file, attachment_meta)
    filepart = Faraday::FilePart.new(file.path, attachment_meta[:mime_type], attachment_meta[:name])
    params = {
      "reportId": report_id,
      file: filepart
    }
    multipart_faraday.post("/api/files", params)
  end

  def put(url, params)
    faraday.put(url, params.to_json, "Content-Type" => "application/json")
  end

  def get(url)
    faraday.get(url)
  end

  def multipart_faraday
    @multipart_faraday ||= Faraday.new(url: SMARTHUB_URI_BASE, headers: {'Cookie' => cookie}) do |f|
      f.request :multipart
    end
  end

  def faraday
    @faraday ||= Faraday.new(url: SMARTHUB_URI_BASE, headers: {'Cookie' => cookie})
  end

  def retrieve_discussion(disc_id)
    client.sheets.discussions.get(sheet_id: sheet_id, discussion_id: disc_id)[:comments].map do |comment|
      "#{comment[:created_by][:email]}: #{comment[:text]}"
    end
  end

  def report_id_column_id
    @report_id_column_id ||= sheet_columns.find { |c| c[:title] == "ReportID" }[:id]
  end

  def sheet_columns
    @sheet_columns ||= client.sheets.columns.list(sheet_id: sheet_id)[:data]
  end

  def sheet_id
    @sheet_id ||= Config.load[region][:ar_sheet_id]
  end
end
